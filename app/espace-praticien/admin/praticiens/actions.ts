"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceRoleSupabase, getSiteUrl } from "@/lib/supabase/admin";
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

  if (!email.includes("@") || !practiceId) {
    go({ error: "invite-validation" });
  }

  let admin;
  try {
    admin = getServiceRoleSupabase();
  } catch {
    go({ error: "service-role" });
  }

  const redirectTo = `${getSiteUrl()}/espace-praticien/auth/callback?next=/espace-praticien/fermetures`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: fullName.length > 0 ? { full_name: fullName } : undefined,
  });

  if (error || !data.user) {
    const message = error?.message?.toLowerCase() ?? "";
    if (message.includes("already") || message.includes("registered")) {
      go({ error: "invite-exists" });
    }
    go({ error: "invite-failed" });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      practice_id: practiceId,
      full_name: fullName.length > 0 ? fullName : null,
      role: "practitioner",
    })
    .eq("id", data.user.id);

  if (profileError) {
    go({ error: "invite-profile" });
  }

  revalidatePath(PRATICIENS_PATH);
  revalidatePath("/espace-praticien/admin");
  go({ ok: "invited" });
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
