import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  authFieldClassName,
  authLabelClassName,
} from "@/components/auth/authFormStyles";
import { Button } from "@/components/ui/Button";
import { getSessionUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { setPassword } from "./actions";

export const metadata: Metadata = {
  title: "Définir votre mot de passe — Espace praticien",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  short: "Le mot de passe doit contenir au moins 8 caractères.",
  mismatch: "Les deux mots de passe ne correspondent pas.",
  weak: "Ce mot de passe est trop courant. Choisissez-en un plus complexe.",
  "update-failed":
    "Impossible d’enregistrer le mot de passe. Réessayez ou contactez le laboratoire.",
};

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/espace-praticien/login?error=config");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/espace-praticien/login?error=invite");
  }

  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;

  return (
    <div className="mx-auto max-w-md py-10">
      <p className="text-eyebrow text-[var(--ink-discreet)]">Bienvenue</p>
      <h1 className="text-display text-3xl md:text-4xl mt-3 text-[var(--ink)]">
        Définir votre mot de passe
      </h1>
      <p className="mt-4 text-sm text-[var(--ink-muted)] leading-relaxed">
        Votre compte a été activé pour <strong>{user.email}</strong>. Choisissez
        un mot de passe pour finaliser l’accès à l’espace praticien.
      </p>

      <form action={setPassword} className="mt-10 flex flex-col gap-7" noValidate>
        <label className="flex flex-col gap-3">
          <span className={authLabelClassName}>Nouveau mot de passe</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={authFieldClassName}
            placeholder="Au moins 8 caractères"
          />
        </label>

        <label className="flex flex-col gap-3">
          <span className={authLabelClassName}>Confirmer le mot de passe</span>
          <input
            type="password"
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            className={authFieldClassName}
          />
        </label>

        {errorMessage ? (
          <p role="alert" className="text-sm text-[var(--accent-warm)]">
            {errorMessage}
          </p>
        ) : null}

        <div className="pt-2">
          <Button type="submit" variant="primary">
            Enregistrer et accéder à mon espace
          </Button>
        </div>
      </form>
    </div>
  );
}
