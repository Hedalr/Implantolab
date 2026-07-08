"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getServiceRoleSupabase,
  getSiteUrl,
  withAdminTimeout,
} from "@/lib/supabase/admin";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";

const PRATICIENS_PATH = "/espace-praticien/admin/praticiens";

function go(params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(`${PRATICIENS_PATH}?${query}`);
}

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createPractice(formData: FormData): Promise<void> {
  await requireAdmin();

  const name = readText(formData, "name");
  const city = readText(formData, "city");

  if (name.length < 2) {
    go({ error: "practice-name" });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("practices").insert({
    name,
    city: city.length > 0 ? city : null,
  });

  if (error) {
    go({ error: "practice-save" });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath("/espace-praticien/admin");
  go({ ok: "practice-created" });
}

export async function invitePractitioner(formData: FormData): Promise<void> {
  await requireAdmin();

  const email = readText(formData, "email").toLowerCase();
  const fullName = readText(formData, "full_name");
  const practiceId = readText(formData, "practice_id");
  const rawRole = readText(formData, "role") || "practitioner";
  const role: "practitioner" | "prosthetist" =
    rawRole === "prosthetist" ? "prosthetist" : "practitioner";

  if (!email.includes("@")) {
    go({ error: "invite-validation" });
  }
  // Le cabinet n'est requis que pour un praticien ; un prothésiste n'y est
  // pas rattaché.
  if (role === "practitioner" && !practiceId) {
    go({ error: "invite-validation" });
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
      go({ error: "invite-exists" });
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
      practice_id: role === "practitioner" ? practiceId : null,
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

export async function linkPractitioner(formData: FormData): Promise<void> {
  await requireAdmin();

  const profileId = readText(formData, "profile_id");
  const practiceId = readText(formData, "practice_id");
  const fullName = readText(formData, "full_name");

  if (!profileId || !practiceId) {
    go({ error: "link-validation" });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      practice_id: practiceId,
      ...(fullName.length > 0 ? { full_name: fullName } : {}),
    })
    .eq("id", profileId)
    .eq("role", "practitioner");

  if (error) {
    go({ error: "link-failed" });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath("/espace-praticien/admin");
  go({ ok: "linked" });
}
