"use server";

import { redirect } from "next/navigation";
import {
  getServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/** Connexion email + mot de passe. Erreurs → `/login?error=1` (message générique). */
export async function signIn(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect("/espace-praticien/login?error=config");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/espace-praticien/login?error=1");
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/espace-praticien/login?error=1");
  }

  redirect("/espace-praticien");
}
