"use server";

import { redirect } from "next/navigation";
import {
  getServerSupabase,
  getSessionUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/**
 * Server action de première définition du mot de passe (post-invitation)
 * ou de changement de mot de passe pour un utilisateur déjà connecté.
 *
 * Nécessite une session active : le lien d'invitation Supabase établit la
 * session automatiquement via /espace-praticien/auth/callback, ce qui permet
 * ensuite à cette page d'appeler `auth.updateUser({ password })`.
 */
export async function setPassword(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect("/espace-praticien/login?error=config");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/espace-praticien/login?error=session");
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    redirect("/espace-praticien/set-password?error=short");
  }
  if (password !== confirm) {
    redirect("/espace-praticien/set-password?error=mismatch");
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const key = error.message.toLowerCase().includes("weak")
      ? "weak"
      : "update-failed";
    redirect(`/espace-praticien/set-password?error=${key}`);
  }

  redirect("/espace-praticien?ok=password-set");
}
