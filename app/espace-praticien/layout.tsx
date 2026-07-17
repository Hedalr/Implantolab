import type { ReactNode } from "react";
import type { NavLink } from "@/content/fr/site";
import { Container } from "@/components/ui/Container";
import { EspacePraticienNav } from "@/components/layout/EspacePraticienNav";
import {
  getCurrentProfile,
  getSessionUser,
  isSupabaseConfigured,
  type Profile,
} from "@/lib/supabase/server";

const practitionerNav: NavLink[] = [
  { href: "/espace-praticien/fermetures", label: "Mes fermetures" },
  { href: "/espace-praticien/demandes", label: "Demandes" },
];

const adminNav: NavLink[] = [
  { href: "/espace-praticien/admin", label: "Vue d'ensemble" },
  {
    href: "/espace-praticien/admin/praticiens",
    label: "Praticiens",
    children: [
      {
        href: "/espace-praticien/admin/calendrier",
        label: "Fermetures dentistes",
      },
    ],
  },
  {
    href: "/espace-praticien/admin/employes",
    label: "Employés",
    children: [
      { href: "/espace-praticien/admin/conges", label: "Congés employés" },
    ],
  },
  { href: "/espace-praticien/admin/demandes", label: "Demandes reçues" },
  { href: "/espace-praticien/laboratoire", label: "Laboratoire" },
];

const prosthetistNav: NavLink[] = [
  { href: "/espace-praticien/laboratoire", label: "Laboratoire" },
  { href: "/espace-praticien/conges", label: "Mes congés" },
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

  const spaceLabel =
    profile?.role === "admin"
      ? "Espace admin"
      : profile?.role === "prosthetist"
        ? "Espace collaborateur"
        : "Espace praticien";

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[var(--bg)]">
      <div className="sticky top-16 md:top-20 z-30 border-b border-[var(--line)] bg-[var(--bg-elevated)]">
        <Container size="wide">
          <div className="flex h-14 items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <span className="text-eyebrow text-[var(--ink-discreet)] hidden sm:inline">
                {spaceLabel}
              </span>

              {showNav ? (
                <EspacePraticienNav items={nav} variant="desktop" />
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
            <EspacePraticienNav items={nav} variant="mobile" />
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
