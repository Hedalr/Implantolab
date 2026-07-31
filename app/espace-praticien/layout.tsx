import type { ReactNode } from "react";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { EspacePraticienNav } from "@/components/layout/EspacePraticienNav";
import { listLabSectors } from "@/lib/requests/queries";
import { navForRole, spaceLabelForRole } from "@/lib/roles";
import {
  getCurrentProfile,
  getServerSupabase,
  isSupabaseConfigured,
  type Profile,
} from "@/lib/supabase/server";

export default async function EspacePraticienLayout({
  children,
}: {
  children: ReactNode;
}) {
  const configured = isSupabaseConfigured();
  const profile: Profile | null = configured
    ? await getCurrentProfile()
    : null;

  const sectors =
    configured && profile?.role === "admin"
      ? await listLabSectors(await getServerSupabase())
      : [];

  const nav = navForRole(profile?.role, { sectors });
  const showNav = Boolean(profile);
  const spaceLabel = spaceLabelForRole(profile?.role);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[var(--bg)]">
      <div className="sticky top-16 md:top-20 z-30 border-b border-[var(--line)] bg-[var(--bg-elevated)]">
        <Container size="wide">
          <div className="flex h-14 items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-8">
              <span className="text-eyebrow text-[var(--ink-discreet)] hidden sm:inline">
                {spaceLabel}
              </span>

              {showNav ? (
                <Suspense fallback={null}>
                  <EspacePraticienNav items={nav} variant="desktop" />
                </Suspense>
              ) : null}
            </div>

            {showNav && profile ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-xs text-[var(--ink)]">{profile.email}</span>
                  {profile.fullName ? (
                    <span className="text-[11px] text-[var(--ink-discreet)]">
                      {profile.fullName}
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
            <Suspense fallback={null}>
              <EspacePraticienNav items={nav} variant="mobile" />
            </Suspense>
          ) : null}
        </Container>
      </div>

      <main>
        <Container
          size="wide"
          className="py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-10"
        >
          {children}
        </Container>
      </main>
    </div>
  );
}
