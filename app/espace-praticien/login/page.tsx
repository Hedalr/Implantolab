import Link from "next/link";
import { signIn } from "./actions";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const configError = params.error === "config" || !configured;
  const credentialsError = params.error === "1";

  const fieldBase = cn(
    "w-full bg-transparent border-b py-3 text-base transition-colors",
    "placeholder:text-[var(--ink-discreet)] focus:outline-none",
    "text-[var(--ink)] border-[var(--line-strong)] focus:border-[var(--ink)]",
  );

  const labelBase = "text-eyebrow text-[var(--ink-discreet)]";

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
              href="tel:+33967359779"
              className="underline decoration-[var(--line-strong)] hover:decoration-[var(--ink)]"
            >
              09 67 35 97 79
            </a>{" "}
            ou à{" "}
            <a
              href="mailto:contact@implantolab.fr"
              className="underline decoration-[var(--line-strong)] hover:decoration-[var(--ink)]"
            >
              contact@implantolab.fr
            </a>{" "}
            pour obtenir vos accès.
          </p>
        </div>
      ) : (
        <form action={signIn} className="mt-10 flex flex-col gap-7" noValidate>
          <label className="flex flex-col gap-3">
            <span className={labelBase}>Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className={fieldBase}
            />
          </label>

          <label className="flex flex-col gap-3">
            <span className={labelBase}>Mot de passe</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className={fieldBase}
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

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="submit"
              className={cn(
                "inline-flex items-center gap-3 px-7 py-3.5 text-sm tracking-wide transition-colors border",
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
              href="mailto:contact@implantolab.fr?subject=Mot%20de%20passe%20oubli%C3%A9"
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
