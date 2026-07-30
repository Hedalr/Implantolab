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
    // Log complet côté serveur (visible dans les logs Vercel) pour
    // diagnostiquer les échecs Auth (mot de passe déjà utilisé, session
    // expirée, rate limit, etc.).
    console.error("[setPassword] échec updateUser:", error.message, error);
    const message = error.message.toLowerCase();
    const key = message.includes("weak")
      ? "weak"
      : message.includes("should be different")
        ? "same-password"
        : message.includes("session")
          ? "session-expired"
          : message.includes("security purposes") ||
              message.includes("rate limit")
            ? "rate-limit"
            : "update-failed";
    const params = new URLSearchParams({ error: key });
    if (key === "update-failed") {
      params.set("detail", error.message.slice(0, 200));
    }
    redirect(`/espace-praticien/set-password?${params.toString()}`);
  }

  redirect("/espace-praticien?ok=password-set");
}
