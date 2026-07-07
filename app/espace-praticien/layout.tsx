import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import {
  getCurrentProfile,
  getSessionUser,
  isSupabaseConfigured,
  type Profile,
} from "@/lib/supabase/server";

type NavItem = { href: string; label: string };

const practitionerNav: NavItem[] = [
  { href: "/espace-praticien/fermetures", label: "Mes fermetures" },
  { href: "/espace-praticien/demandes", label: "Demandes" },
];

const adminNav: NavItem[] = [
  { href: "/espace-praticien/admin", label: "Vue d'ensemble" },
  { href: "/espace-praticien/admin/praticiens", label: "Praticiens" },
  { href: "/espace-praticien/admin/calendrier", label: "Calendrier" },
  { href: "/espace-praticien/admin/demandes", label: "Demandes reçues" },
  { href: "/espace-praticien/laboratoire", label: "Laboratoire" },
];

const prosthetistNav: NavItem[] = [
  { href: "/espace-praticien/laboratoire", label: "Dossiers patient" },
];

export default async function EspacePraticienLayout({
  children,
}: {
  children: ReactNode;
}) {
  const configured = isSupabaseConfigured();
  let profile: Profile | null = null;
  let email: string | null = null;

  if (configured) {
    const user = await getSessionUser();
    if (user) {
      email = user.email;
      profile = await getCurrentProfile();
    }
  }

  const nav =
    profile?.role === "admin"
      ? adminNav
      : profile?.role === "prosthetist"
        ? prosthetistNav
        : practitionerNav;
  const showNav = Boolean(profile);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[var(--bg)]">
      <div className="sticky top-16 md:top-20 z-30 border-b border-[var(--line)] bg-[var(--bg-elevated)]">
        <Container size="wide">
          <div className="flex h-14 items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <Logo href="/espace-praticien" showWordmark={false} />
              <span className="text-eyebrow text-[var(--ink-discreet)] hidden sm:inline">
                Espace praticien
              </span>

              {showNav ? (
                <nav
                  aria-label="Navigation praticien"
                  className="hidden md:flex items-center gap-6"
                >
                  {nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors",
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </div>

            {showNav && email ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-xs text-[var(--ink)]">{email}</span>
                  {profile?.practiceName ? (
                    <span className="text-[11px] text-[var(--ink-discreet)]">
                      {profile.practiceName}
                    </span>
                  ) : null}
                </div>
                <form action="/espace-praticien/logout" method="post">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 border border-[var(--line-strong)] px-3 py-1.5 text-xs tracking-wide text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
                  >
                    Déconnexion
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          {showNav ? (
            <nav
              aria-label="Navigation praticien (mobile)"
              className="flex md:hidden items-center gap-5 overflow-x-auto pb-3 pt-1 -mx-6 px-6"
            >
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </Container>
      </div>

      <main>
        <Container size="wide" className="py-10">
          {children}
        </Container>
      </main>
    </div>
  );
}
