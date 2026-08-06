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
import {
  deleteOkKey,
  inviteOkKey,
  isSectorLabRole,
  parseInviteRole,
  type InviteRole,
  type ProfileRole,
} from "@/lib/roles";
import { EQUIPE_PATH } from "@/lib/equipe";

const PRATICIENS_PATH = "/espace-praticien/admin/praticiens";
const ADMIN_HOME_PATH = "/espace-praticien/admin";

/**
 * Durée de bannissement Supabase Auth utilisée pour désactiver un compte.
 * L'API n'accepte que des unités jusqu'à l'heure ; 876000h ≈ 100 ans, la
 * valeur documentée par Supabase pour un bannissement de facto permanent.
 */
const PERMANENT_BAN_DURATION = "876000h";

const ALLOWED_RETURN_PATHS = [PRATICIENS_PATH, EQUIPE_PATH] as const;

function resolveReturnBase(
  formData: FormData | undefined,
  role?: InviteRole | ProfileRole | string,
): string {
  const raw = formData ? readText(formData, "return_path") : "";
  if (raw) {
    const pathOnly = raw.split("?")[0];
    if (
      (ALLOWED_RETURN_PATHS as readonly string[]).includes(pathOnly) &&
      raw.startsWith(pathOnly)
    ) {
      return raw.includes("?") ? raw : pathOnly;
    }
  }
  if (role && isSectorLabRole(role as ProfileRole)) {
    return `${EQUIPE_PATH}?tab=invitations`;
  }
  return PRATICIENS_PATH;
}

function go(
  params: Record<string, string>,
  options?: { formData?: FormData; role?: InviteRole | ProfileRole | string },
): never {
  const base = resolveReturnBase(options?.formData, options?.role);
  const [path, existingQuery = ""] = base.split("?");
  const query = new URLSearchParams(existingQuery);
  for (const [key, value] of Object.entries(params)) {
    query.set(key, value);
  }
  redirect(`${path}?${query.toString()}`);
}

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ id: string; email?: string } | null> {
  try {
    const { data } = await withAdminTimeout(
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    );
    const existing = data.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );
    return existing ? { id: existing.id, email: existing.email } : null;
  } catch {
    return null;
  }
}

/**
 * Un utilisateur invité une deuxième fois avec le même e-mail obtient une
 * erreur "already registered" de Supabase Auth — ou, sur certaines versions,
 * un *renvoi* silencieux d'invitation. On pré-vérifie donc l'existence pour
 * ne jamais appeler `inviteUserByEmail` deux fois sur la même adresse.
 */
async function isEmailDeactivated(
  admin: SupabaseClient,
  email: string,
): Promise<boolean> {
  try {
    const existing = await findAuthUserByEmail(admin, email);
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
  const role = parseInviteRole(rawRole);

  if (!email.includes("@")) {
    go({ error: "invite-validation" }, { formData, role });
  }
  if (isSectorLabRole(role) && !sectorId) {
    go({ error: "invite-sector" }, { formData, role });
  }

  let admin;
  try {
    admin = getServiceRoleSupabase();
  } catch {
    go({ error: "service-role" }, { formData, role });
  }

  // Anti-doublon : si l'adresse existe déjà, on n'appelle PAS inviteUserByEmail
  // (qui renverrait un second e-mail d'invitation au lieu d'échouer).
  const already = await findAuthUserByEmail(admin, email);
  if (already) {
    const { data: profile } = await admin
      .from("profiles")
      .select("deleted_at")
      .eq("id", already.id)
      .maybeSingle();
    go(
      {
        error: profile?.deleted_at ? "invite-exists-deleted" : "invite-exists",
      },
      { formData, role },
    );
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
      20_000,
    );
    data = res.data;
    error = res.error;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[invitePractitioner] timeout ou exception:", message);
    // Si le SMTP a quand même créé l'utilisateur après le timeout client,
    // on finalise le profil plutôt que d'inciter à un second envoi.
    const createdAfterTimeout = await findAuthUserByEmail(admin, email);
    if (createdAfterTimeout) {
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          sector_id: isSectorLabRole(role) ? sectorId : null,
          full_name: fullName.length > 0 ? fullName : null,
          role,
        })
        .eq("id", createdAfterTimeout.id);
      if (profileError) {
        go({ error: "invite-profile" }, { formData, role });
      }
      revalidatePath(PRATICIENS_PATH);
      revalidatePath(EQUIPE_PATH);
      revalidatePath("/espace-praticien/admin");
      go({ ok: inviteOkKey(role) }, { formData, role });
    }
    go({ error: "invite-smtp", detail: message.slice(0, 200) }, { formData, role });
  }

  if (error || !data?.user) {
    const rawMessage = error?.message ?? "unknown error";
    const message = rawMessage.toLowerCase();
    // Log complet côté serveur (visible dans le terminal `npm run dev` ou
    // les logs Vercel) pour diagnostiquer les erreurs SMTP / Auth.
    console.error("[invitePractitioner] échec inviteUserByEmail:", rawMessage, error);
    if (message.includes("already") || message.includes("registered")) {
      const deactivated = await isEmailDeactivated(admin, email);
      go(
        { error: deactivated ? "invite-exists-deleted" : "invite-exists" },
        { formData, role },
      );
    }
    if (
      message.includes("rate limit") ||
      message.includes("email rate limit")
    ) {
      go({ error: "invite-rate-limit" }, { formData, role });
    }
    if (
      message.includes("smtp") ||
      message.includes("sending") ||
      message.includes("email") ||
      message.includes("relay")
    ) {
      go(
        {
          error: "invite-smtp",
          detail: rawMessage.slice(0, 200),
        },
        { formData, role },
      );
    }
    go(
      { error: "invite-failed", detail: rawMessage.slice(0, 200) },
      { formData, role },
    );
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      sector_id: isSectorLabRole(role) ? sectorId : null,
      full_name: fullName.length > 0 ? fullName : null,
      role,
    })
    .eq("id", data.user.id);

  if (profileError) {
    go({ error: "invite-profile" }, { formData, role });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath(EQUIPE_PATH);
  revalidatePath("/espace-praticien/admin");
  go({ ok: inviteOkKey(role) }, { formData, role });
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
    go({ error: "delete-validation" }, { formData });
  }

  let admin;
  try {
    admin = getServiceRoleSupabase();
  } catch {
    go({ error: "service-role" }, { formData });
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle();

  // On ne permet la désactivation que des comptes praticien/prothésiste :
  // jamais un admin (aucune UI ne devrait de toute façon en proposer un ici).
  if (!target || target.role === "admin") {
    go({ error: "delete-validation" }, { formData });
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
    go(
      { error: "delete-failed", detail: message.slice(0, 200) },
      { formData, role: target.role },
    );
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
    go({ error: "delete-failed" }, { formData, role: target.role });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath(EQUIPE_PATH);
  revalidatePath(ADMIN_HOME_PATH);
  go({ ok: deleteOkKey(target.role) }, { formData, role: target.role });
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
    go({ error: "delete-validation" }, { formData });
  }

  let admin;
  try {
    admin = getServiceRoleSupabase();
  } catch {
    go({ error: "service-role" }, { formData });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  const role = profile?.role;

  const { data: userData, error: userError } = await withAdminTimeout(
    admin.auth.admin.getUserById(profileId),
  );

  if (userError || !userData?.user?.email) {
    go({ error: "reactivate-failed" }, { formData, role });
  }

  try {
    await withAdminTimeout(
      admin.auth.admin.updateUserById(profileId, { ban_duration: "none" }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reactivatePractitioner] échec de la levée du ban:", message);
    go({ error: "reactivate-failed" }, { formData, role });
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
    go({ error: "reactivate-failed" }, { formData, role });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath(EQUIPE_PATH);
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
    go({ error: "reactivate-partial" }, { formData, role });
  }

  go({ ok: "reactivated" }, { formData, role });
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
    go({ error: "delete-validation" }, { formData });
  }

  let admin;
  try {
    admin = getServiceRoleSupabase();
  } catch {
    go({ error: "service-role" }, { formData });
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, deleted_at")
    .eq("id", profileId)
    .maybeSingle();

  if (!target || target.role === "admin" || !target.deleted_at) {
    go({ error: "delete-validation" }, { formData });
  }

  try {
    await withAdminTimeout(admin.auth.admin.deleteUser(profileId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[permanentlyDeletePractitioner] échec de la suppression:",
      message,
    );
    go(
      { error: "delete-failed", detail: message.slice(0, 200) },
      { formData, role: target.role },
    );
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath(EQUIPE_PATH);
  revalidatePath(ADMIN_HOME_PATH);
  go(
    { ok: "deleted-permanently" },
    { formData, role: target.role },
  );
}
