"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PG_SESSION_COOKIE } from "@/lib/auth/postgres/cookies";
import { isPostgresBackend } from "@/lib/db/backend";
import { checkPasswordPolicy, setPasswordPg } from "@/lib/rh/pg";
import { homePathForRole } from "@/lib/roles";
import {
  getCurrentProfile,
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

  const policyError = checkPasswordPolicy(password, confirm);
  if (policyError === "password-short") {
    redirect("/espace-praticien/set-password?error=short");
  }
  if (policyError === "password-mismatch") {
    redirect("/espace-praticien/set-password?error=mismatch");
  }
  if (policyError === "password-weak") {
    redirect("/espace-praticien/set-password?error=weak");
  }

  if (isPostgresBackend()) {
    const cookieStore = await cookies();
    const keepSessionToken =
      cookieStore.get(PG_SESSION_COOKIE)?.value ?? null;
    const result = await setPasswordPg({
      userId: user.id,
      password,
      confirm,
      keepSessionToken,
    });
    if (!result.ok) {
      const key =
        result.error === "password-short"
          ? "short"
          : result.error === "password-mismatch"
            ? "mismatch"
            : result.error === "password-weak"
              ? "weak"
              : "update-failed";
      redirect(`/espace-praticien/set-password?error=${key}`);
    }
    const profile = await getCurrentProfile();
    redirect(
      `${homePathForRole(profile?.role)}?ok=password-set`,
    );
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
