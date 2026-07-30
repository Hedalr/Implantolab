"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getServiceRoleSupabase,
  getSiteUrl,
  withAdminTimeout,
} from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

const PRATICIENS_PATH = "/espace-praticien/admin/praticiens";
const EMPLOYES_PATH = "/espace-praticien/admin/employes";
const ADMIN_HOME_PATH = "/espace-praticien/admin";

/**
 * Durée de bannissement Supabase Auth utilisée pour désactiver un compte.
 * L'API n'accepte que des unités jusqu'à l'heure ; 876000h ≈ 100 ans, la
 * valeur documentée par Supabase pour un bannissement de facto permanent.
 */
const PERMANENT_BAN_DURATION = "876000h";

function go(params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(`${PRATICIENS_PATH}?${query}`);
}

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Un utilisateur invité une deuxième fois avec le même e-mail obtient une
 * erreur "already registered" de Supabase Auth. On distingue ce cas d'une
 * vraie collision (compte actif) pour orienter l'admin vers le bouton
 * « Réactiver » plutôt que de laisser penser que l'adresse est bloquée à vie.
 */
async function isEmailDeactivated(
  admin: SupabaseClient,
  email: string,
): Promise<boolean> {
  try {
    const { data } = await withAdminTimeout(
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    );
    const existing = data.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );
    if (!existing) return false;

    const { data: profile } = await admin
      .from("profiles")
      .select("deleted_at")
      .eq("id", existing.id)
      .maybeSingle();

    return Boolean(profile?.deleted_at);
  } catch {
    return false;
  }
}

export async function invitePractitioner(formData: FormData): Promise<void> {
  await requireAdmin();

  const email = readText(formData, "email").toLowerCase();
  const fullName = readText(formData, "full_name");
  const sectorId = readText(formData, "sector_id");
  const rawRole = readText(formData, "role") || "practitioner";
  const role: "practitioner" | "prosthetist" =
    rawRole === "prosthetist" ? "prosthetist" : "practitioner";

  if (!email.includes("@")) {
    go({ error: "invite-validation" });
  }
  // Un prothésiste doit avoir un secteur ; un praticien n'a besoin d'aucun
  // rattachement supplémentaire pour être opérationnel.
  if (role === "prosthetist" && !sectorId) {
    go({ error: "invite-sector" });
  }

  let admin;
  try {
    admin = getServiceRoleSupabase();
  } catch {
    go({ error: "service-role" });
  }

  // Redirect vers /set-password après validation de l'invitation : le user
  // définit son mot de passe avant d'accéder à son espace. Sans cette étape,
  // il n'aurait aucun mot de passe et ne pourrait plus se reconnecter.
  const redirectTo = `${getSiteUrl()}/espace-praticien/auth/callback?next=/espace-praticien/set-password`;

  // On enveloppe l'appel dans un timeout : si le SMTP par défaut de Supabase
  // ralentit, on renvoie une erreur explicite plutôt que de laisser la
  // Function Vercel se faire tuer par timeout (10 s Hobby, 60 s Pro).
  let data: Awaited<
    ReturnType<typeof admin.auth.admin.inviteUserByEmail>
  >["data"] | null = null;
  let error: { message?: string } | null = null;
  try {
    const res = await withAdminTimeout(
      admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: fullName.length > 0 ? { full_name: fullName } : undefined,
      }),
    );
    data = res.data;
    error = res.error;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[invitePractitioner] timeout ou exception:", message);
    go({ error: "invite-smtp", detail: message.slice(0, 200) });
  }

  if (error || !data?.user) {
    const rawMessage = error?.message ?? "unknown error";
    const message = rawMessage.toLowerCase();
    // Log complet côté serveur (visible dans le terminal `npm run dev` ou
    // les logs Vercel) pour diagnostiquer les erreurs SMTP / Auth.
    console.error("[invitePractitioner] échec inviteUserByEmail:", rawMessage, error);
    if (message.includes("already") || message.includes("registered")) {
      const deactivated = await isEmailDeactivated(admin, email);
      go({ error: deactivated ? "invite-exists-deleted" : "invite-exists" });
    }
    if (
      message.includes("rate limit") ||
      message.includes("email rate limit")
    ) {
      go({ error: "invite-rate-limit" });
    }
    if (
      message.includes("smtp") ||
      message.includes("sending") ||
      message.includes("email") ||
      message.includes("relay")
    ) {
      go({
        error: "invite-smtp",
        detail: rawMessage.slice(0, 200),
      });
    }
    go({ error: "invite-failed", detail: rawMessage.slice(0, 200) });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      sector_id: role === "prosthetist" ? sectorId : null,
      full_name: fullName.length > 0 ? fullName : null,
      role,
    })
    .eq("id", data.user.id);

  if (profileError) {
    go({ error: "invite-profile" });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath("/espace-praticien/admin");
  go({ ok: role === "prosthetist" ? "invited-prosthetist" : "invited" });
}

/**
 * Révoque l'accès d'un praticien ou d'un employé (bannissement Supabase Auth
 * + `profiles.deleted_at`). L'historique (demandes, congés, fermetures) et le
 * compte lui-même sont conservés : rien n'est supprimé, donc rien à
 * reconstruire en cas d'erreur. Le compte peut être réactivé plus tard via
 * `reactivatePractitioner`, ce qui libère son adresse e-mail pour une
 * nouvelle prise en charge sans passer par une nouvelle invitation.
 */
export async function deletePractitioner(formData: FormData): Promise<void> {
  await requireAdmin();

  const profileId = readText(formData, "profile_id");
  if (!profileId) {
    go({ error: "delete-validation" });
  }

  let admin;
  try {
    admin = getServiceRoleSupabase();
  } catch {
    go({ error: "service-role" });
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle();

  // On ne permet la désactivation que des comptes praticien/prothésiste :
  // jamais un admin (aucune UI ne devrait de toute façon en proposer un ici).
  if (!target || target.role === "admin") {
    go({ error: "delete-validation" });
  }

  try {
    await withAdminTimeout(
      admin.auth.admin.updateUserById(profileId, {
        ban_duration: PERMANENT_BAN_DURATION,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[deletePractitioner] échec du bannissement:", message);
    go({ error: "delete-failed", detail: message.slice(0, 200) });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", profileId);

  if (profileError) {
    console.error(
      "[deletePractitioner] compte banni mais deleted_at non enregistré:",
      profileError.message,
    );
    go({ error: "delete-failed" });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath(EMPLOYES_PATH);
  revalidatePath(ADMIN_HOME_PATH);
  go({ ok: target.role === "prosthetist" ? "deleted-prosthetist" : "deleted" });
}

/**
 * Réactive un compte désactivé : lève le bannissement, efface
 * `deleted_at`, puis envoie un e-mail de réinitialisation de mot de passe
 * (le compte existe déjà côté Auth — on ne peut pas ré-inviter au sens
 * strict — géré par le même flux `/set-password` que les invitations).
 */
export async function reactivatePractitioner(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const profileId = readText(formData, "profile_id");
  if (!profileId) {
    go({ error: "delete-validation" });
  }

  let admin;
  try {
    admin = getServiceRoleSupabase();
  } catch {
    go({ error: "service-role" });
  }

  const { data: userData, error: userError } = await withAdminTimeout(
    admin.auth.admin.getUserById(profileId),
  );

  if (userError || !userData?.user?.email) {
    go({ error: "reactivate-failed" });
  }

  try {
    await withAdminTimeout(
      admin.auth.admin.updateUserById(profileId, { ban_duration: "none" }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reactivatePractitioner] échec de la levée du ban:", message);
    go({ error: "reactivate-failed" });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", profileId);

  if (profileError) {
    console.error(
      "[reactivatePractitioner] ban levé mais deleted_at non réinitialisé:",
      profileError.message,
    );
    go({ error: "reactivate-failed" });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath(EMPLOYES_PATH);
  revalidatePath(ADMIN_HOME_PATH);

  const redirectTo = `${getSiteUrl()}/espace-praticien/auth/callback?next=/espace-praticien/set-password`;
  try {
    await withAdminTimeout(
      admin.auth.resetPasswordForEmail(userData.user.email, { redirectTo }),
    );
  } catch (err) {
    // Le compte est bien réactivé (l'accès fonctionne à nouveau) ; seul
    // l'e-mail de reconnexion n'a pas pu partir. On log et on informe l'admin
    // sans annuler la réactivation.
    console.error(
      "[reactivatePractitioner] e-mail de réinitialisation non envoyé:",
      err instanceof Error ? err.message : err,
    );
    go({ error: "reactivate-partial" });
  }

  go({ ok: "reactivated" });
}

/**
 * Supprime définitivement un compte désactivé : le compte Supabase Auth est
 * effacé (`deleteUser`), ce qui supprime en cascade la ligne `profiles` et
 * tout son historique (demandes, congés, fermetures — `on delete cascade`).
 * Contrairement à `deletePractitioner`, cette action est irréversible et
 * libère immédiatement l'adresse e-mail pour une invitation classique.
 * Réservée aux comptes déjà désactivés, pour éviter un clic accidentel sur
 * un compte encore actif.
 */
export async function permanentlyDeletePractitioner(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const profileId = readText(formData, "profile_id");
  if (!profileId) {
    go({ error: "delete-validation" });
  }

  let admin;
  try {
    admin = getServiceRoleSupabase();
  } catch {
    go({ error: "service-role" });
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, deleted_at")
    .eq("id", profileId)
    .maybeSingle();

  if (!target || target.role === "admin" || !target.deleted_at) {
    go({ error: "delete-validation" });
  }

  try {
    await withAdminTimeout(admin.auth.admin.deleteUser(profileId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[permanentlyDeletePractitioner] échec de la suppression:",
      message,
    );
    go({ error: "delete-failed", detail: message.slice(0, 200) });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath(EMPLOYES_PATH);
  revalidatePath(ADMIN_HOME_PATH);
  go({ ok: "deleted-permanently" });
}
