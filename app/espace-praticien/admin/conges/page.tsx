import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import { AdminLeaveCalendar } from "@/components/espace-praticien/AdminLeaveCalendar";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import {
  adminApproveLeaveRequest,
  adminDeleteLeaveRequest,
  adminRejectLeaveRequest,
} from "./actions";

export const metadata: Metadata = {
  title: "Congés employés — Espace praticien",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string }>;

type LeaveStatus = "pending" | "approved" | "rejected";

type EmployeeRow = {
  id: string;
  full_name: string | null;
  sector_id: string | null;
  leave_balance_days: number | null;
  sectors: { name: string | null; color: string | null } | null;
};

type LeaveRow = {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  note: string | null;
  status: LeaveStatus;
  created_at: string;
  profiles: {
    full_name: string | null;
    sector_id: string | null;
    sectors: { name: string | null; color: string | null } | null;
  } | null;
};

const FEEDBACK: Record<string, string> = {
  approved: "La demande de congé a été confirmée.",
  rejected: "La demande de congé a été refusée.",
  deleted: "Le congé a été supprimé.",
  validation: "Congé invalide.",
  delete: "Impossible de supprimer ce congé.",
  review: "Impossible de traiter cette demande. Merci de réessayer.",
  balance: "Solde insuffisant pour confirmer cette demande.",
  conflict:
    "Cette période chevauche déjà un congé confirmé ou en attente dans le même secteur.",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatDate(iso: string): string {
  return dateFormatter.format(parseDateOnly(iso));
}

function formatRange(start: string, end: string): string {
  if (start === end) return `Le ${formatDate(start)}`;
  return `Du ${formatDate(start)} au ${formatDate(end)}`;
}

function extractRelation<T>(rel: T | T[] | null): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export default async function AdminCongesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const feedbackKey = ok ?? error;
  const feedbackMessage = feedbackKey ? FEEDBACK[feedbackKey] : null;
  const isError = Boolean(error);

  const supabase = await getServerSupabase();

  const { data: employeesData } = await supabase
    .from("profiles")
    .select(
      "id, full_name, sector_id, leave_balance_days, sectors ( name, color )",
    )
    .eq("role", "prosthetist")
    .order("full_name", { ascending: true });

  const { data: leavesData } = await supabase
    .from("leave_requests")
    .select(
      "id, profile_id, start_date, end_date, days_count, note, status, created_at, profiles ( full_name, sector_id, sectors ( name, color ) )",
    )
    .order("start_date", { ascending: true });

  const employees = ((employeesData ?? []) as unknown as EmployeeRow[]).map(
    (e) => {
      const sector = extractRelation(e.sectors);
      return {
        id: e.id,
        fullName: e.full_name,
        sectorId: e.sector_id,
        sectorName: sector?.name ?? null,
        sectorColor: sector?.color ?? null,
      };
    },
  );

  const leaves = ((leavesData ?? []) as unknown as LeaveRow[]).map((l) => {
    const profile = l.profiles;
    const sector = extractRelation(profile?.sectors ?? null);
    return {
      id: l.id,
      profileId: l.profile_id,
      employeeName: profile?.full_name ?? "Sans nom",
      sectorId: profile?.sector_id ?? null,
      sectorName: sector?.name ?? null,
      sectorColor: sector?.color ?? null,
      startDate: l.start_date,
      endDate: l.end_date,
      daysCount: l.days_count,
      note: l.note,
      status: l.status,
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const pendingLeaves = leaves
    .filter((l) => l.status === "pending")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const upcomingLeaves = leaves
    .filter(
      (l) =>
        l.status === "approved" &&
        parseDateOnly(l.endDate).getTime() >= todayTime,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const calendarLeaves = leaves.filter((l) => l.status !== "rejected");

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Congés des employés
        </h1>
        <p className="mt-2 text-[var(--ink-muted)] leading-relaxed">
          Validez les demandes en attente, puis consultez le calendrier des
          congés confirmés. Les couleurs correspondent aux secteurs définis dans{" "}
          <a
            href="/espace-praticien/admin/employes"
            className="underline underline-offset-4 hover:text-[var(--ink)]"
          >
            Employés &amp; secteurs
          </a>
          .
        </p>
      </header>

      {feedbackMessage ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "mb-8 border-l pl-4 py-2 bg-[var(--bg-elevated)] text-sm text-[var(--ink)] max-w-3xl",
            isError ? "border-[var(--ink)]" : "border-[var(--accent-warm)]",
          )}
        >
          <span
            className={cn(
              "text-eyebrow mr-3",
              isError ? "text-[var(--ink-muted)]" : "text-[var(--accent-warm)]",
            )}
          >
            {isError ? "Erreur" : "Confirmation"}
          </span>
          {feedbackMessage}
        </div>
      ) : null}

      <section className="mb-8 bg-[var(--bg-elevated)] border border-[var(--line)] p-5 md:p-6">
        <p className="text-eyebrow">À traiter</p>
        <h2 className="mt-1 font-serif text-xl text-[var(--ink)]">
          Demandes en attente
          {pendingLeaves.length > 0 ? ` (${pendingLeaves.length})` : ""}
        </h2>
        {pendingLeaves.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--ink-discreet)]">
            Aucune demande en attente de validation.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {pendingLeaves.map((l) => (
              <li
                key={l.id}
                className="py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-3 w-3 shrink-0 border border-[var(--line-strong)]"
                      style={{
                        backgroundColor: l.sectorColor ?? "#94a3b8",
                      }}
                    />
                    <span className="text-[var(--ink)] font-medium">
                      {l.employeeName}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {formatRange(l.startDate, l.endDate)} · {l.daysCount} jour
                    {l.daysCount > 1 ? "s" : ""}
                  </p>
                  {l.sectorName ? (
                    <p className="text-xs text-[var(--ink-discreet)]">
                      Secteur : {l.sectorName}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--accent-warm)]">
                      Non classé
                    </p>
                  )}
                  {l.note ? (
                    <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                      {l.note}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <form action={adminApproveLeaveRequest}>
                    <input type="hidden" name="id" value={l.id} />
                    <button
                      type="submit"
                      className="text-xs tracking-wide uppercase text-[var(--accent-warm)] hover:text-[var(--ink)] transition-colors"
                    >
                      Confirmer
                    </button>
                  </form>
                  <form action={adminRejectLeaveRequest}>
                    <input type="hidden" name="id" value={l.id} />
                    <button
                      type="submit"
                      className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--ink)] transition-colors"
                    >
                      Refuser
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AdminLeaveCalendar leaves={calendarLeaves} employees={employees} />
        </div>

        <aside className="lg:col-span-4">
          <div className="bg-[var(--bg-elevated)] border border-[var(--line)] p-5 md:p-6">
            <p className="text-eyebrow">Confirmés</p>
            <h2 className="mt-1 font-serif text-lg text-[var(--ink)]">
              Prochains congés
            </h2>
            {upcomingLeaves.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--ink-discreet)]">
                Aucun congé confirmé à venir.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {upcomingLeaves.map((l) => (
                  <li key={l.id} className="py-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-3 w-3 shrink-0 border border-[var(--line-strong)]"
                        style={{
                          backgroundColor: l.sectorColor ?? "#94a3b8",
                        }}
                      />
                      <span className="text-[var(--ink)] font-medium">
                        {l.employeeName}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ink-muted)]">
                      {formatRange(l.startDate, l.endDate)} · {l.daysCount} jour
                      {l.daysCount > 1 ? "s" : ""}
                    </p>
                    {l.sectorName ? (
                      <p className="text-xs text-[var(--ink-discreet)]">
                        Secteur : {l.sectorName}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--accent-warm)]">
                        Non classé
                      </p>
                    )}
                    {l.note ? (
                      <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                        {l.note}
                      </p>
                    ) : null}
                    <form action={adminDeleteLeaveRequest} className="pt-1">
                      <input type="hidden" name="id" value={l.id} />
                      <button
                        type="submit"
                        className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--accent-warm)] transition-colors"
                      >
                        Annuler ce congé
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </Container>
  );
}
