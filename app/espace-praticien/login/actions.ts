"use server";

import { redirect } from "next/navigation";
import {
  getServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/**
 * Server action de connexion email + mot de passe.
 * Appelée depuis le formulaire de /espace-praticien/login.
 *
 * Erreurs : on ne renvoie jamais de message technique à l'utilisateur ;
 * on redirige vers /login?error=1 pour afficher un message générique.
 */
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
