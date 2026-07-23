"use server";

import { redirect } from "next/navigation";
import {
  getServerSupabase,
  getSessionUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/** Première définition / changement de mot de passe (session invite requise). */
export async function setPassword(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect("/espace-praticien/login?error=config");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/espace-praticien/login?error=invite");
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
