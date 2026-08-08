import Link from "next/link";
import {
  authFieldClassName,
  authLabelClassName,
} from "@/components/auth/authFormStyles";
import { isPostgresBackend } from "@/lib/db/backend";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { buildMailtoHref } from "@/lib/mailto";
import { site } from "@/content/fr/site";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // Postgres (Scalingo) n’a pas besoin des clés Supabase pour afficher le form.
  const configured = isPostgresBackend() || isSupabaseConfigured();
  const configError = params.error === "config" || !configured;
  const credentialsError = params.error === "1";
  const inviteError = params.error === "invite";
  const forgotPasswordHref = buildMailtoHref({
    to: site.contact.email,
    subject: "Mot de passe oublié",
  });

  return (
    <div className="mx-auto max-w-md py-10">
      <p className="text-eyebrow text-[var(--ink-discreet)]">Accès réservé</p>
      <h1 className="text-display text-3xl md:text-4xl mt-3 text-[var(--ink)]">
        Espace praticien
      </h1>
      <p className="mt-4 text-sm text-[var(--ink-muted)] leading-relaxed">
        Connectez-vous avec les identifiants transmis par le laboratoire pour
        gérer vos périodes de fermeture et vos demandes.
      </p>

      {configError ? (
        <div className="mt-8 border border-[var(--line-strong)] bg-[var(--bg-elevated)] p-5">
          <p className="text-sm text-[var(--ink)] font-medium">
            L’espace praticien n’est pas encore configuré.
          </p>
          <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
            Contactez le laboratoire au{" "}
            <a
              href={`tel:${site.contact.phone}`}
              className="underline decoration-[var(--line-strong)] hover:decoration-[var(--ink)]"
            >
              {site.contact.phoneDisplay}
            </a>{" "}
            ou à{" "}
            <a
              href={buildMailtoHref({ to: site.contact.email })}
              className="underline decoration-[var(--line-strong)] hover:decoration-[var(--ink)]"
            >
              {site.contact.email}
            </a>{" "}
            pour obtenir vos accès.
          </p>
        </div>
      ) : (
        <form
          action="/espace-praticien/auth/password"
          method="post"
          className="mt-10 flex flex-col gap-7"
          noValidate
        >
          <label className="flex flex-col gap-3">
            <span className={authLabelClassName}>Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className={authFieldClassName}
            />
          </label>

          <label className="flex flex-col gap-3">
            <span className={authLabelClassName}>Mot de passe</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className={authFieldClassName}
            />
          </label>

          {credentialsError ? (
            <p
              role="alert"
              className="text-sm text-[var(--accent-warm)]"
            >
              Identifiants incorrects. Merci de réessayer.
            </p>
          ) : null}

          {inviteError ? (
            <p
              role="alert"
              className="text-sm text-[var(--accent-warm)]"
            >
              Le lien d&apos;invitation est invalide ou a expiré. Demandez une
              nouvelle invitation, de préférence dans une fenêtre de navigation
              privée si vous étiez déjà connecté.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="submit"
              className={cn(
                "inline-flex items-center gap-3 px-7 py-3.5 text-sm tracking-wide border",
                "transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97]",
                "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]",
                "hover:bg-[var(--accent-warm)] hover:border-[var(--accent-warm)]",
              )}
            >
              Se connecter
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="square"
                />
              </svg>
            </button>

            <Link
              href={forgotPasswordHref}
              className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline decoration-[var(--line-strong)] hover:decoration-[var(--ink)]"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
