import { cn } from "@/lib/cn";
import { AdminLeaveCalendar } from "@/components/espace-praticien/AdminLeaveCalendar";
import { LeaveRangePreview } from "@/components/espace-praticien/LeaveRangePreview";
import { formatDateRange, parseDateOnly } from "@/lib/utils/date";
import {
  adminApproveLeaveRequest,
  adminDeleteLeaveRequest,
  adminRejectLeaveRequest,
} from "@/app/espace-praticien/admin/conges/actions";
import { EQUIPE_PATH } from "@/lib/equipe";
import { firstRelation } from "@/lib/supabase/relation";

export type EquipeLeaveEmployee = {
  id: string;
  fullName: string | null;
  sectorId: string | null;
  sectorName: string | null;
  sectorColor: string | null;
};

export type EquipeLeaveItem = {
  id: string;
  profileId: string;
  employeeName: string;
  sectorId: string | null;
  sectorName: string | null;
  sectorColor: string | null;
  startDate: string;
  endDate: string;
  daysCount: number;
  note: string | null;
  status: "pending" | "approved" | "rejected";
};

export type LeaveRequestDbRow = {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  profiles: {
    full_name: string | null;
    sector_id: string | null;
    sectors: { name: string | null; color: string | null } | null;
  } | null;
};

export function mapLeaveRows(rows: LeaveRequestDbRow[]): EquipeLeaveItem[] {
  return rows.map((l) => {
    const profile = l.profiles;
    const sector = firstRelation(profile?.sectors ?? null);
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
}

export function usedDaysByProfile(
  leaves: EquipeLeaveItem[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of leaves) {
    if (l.status !== "pending" && l.status !== "approved") continue;
    map.set(l.profileId, (map.get(l.profileId) ?? 0) + l.daysCount);
  }
  return map;
}

export function EquipeLeavesPanel({
  leaves,
  employees,
  returnPath,
}: {
  leaves: EquipeLeaveItem[];
  employees: EquipeLeaveEmployee[];
  returnPath?: string;
}) {
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
  const hiddenReturn = returnPath ?? `${EQUIPE_PATH}?tab=conges`;

  return (
    <div className="flex flex-col gap-8">
      <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-5 md:p-6">
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
                className="py-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6 min-w-0">
                  <LeaveRangePreview
                    startDate={l.startDate}
                    endDate={l.endDate}
                  />
                  <div className="flex flex-col gap-1.5 pt-0.5">
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
                      {formatDateRange(l.startDate, l.endDate)} · {l.daysCount}{" "}
                      jour{l.daysCount > 1 ? "s" : ""}
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
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0 lg:pt-1">
                  <form action={adminApproveLeaveRequest}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="return_path" value={hiddenReturn} />
                    <button
                      type="submit"
                      className="text-xs tracking-wide uppercase text-[var(--accent-warm)] hover:text-[var(--ink)] transition-colors"
                    >
                      Confirmer
                    </button>
                  </form>
                  <form action={adminRejectLeaveRequest}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="return_path" value={hiddenReturn} />
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
                      {formatDateRange(l.startDate, l.endDate)} · {l.daysCount}{" "}
                      jour{l.daysCount > 1 ? "s" : ""}
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
                      <input
                        type="hidden"
                        name="return_path"
                        value={hiddenReturn}
                      />
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
    </div>
  );
}

export const EQUIPE_LEAVE_FEEDBACK: Record<string, string> = {
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

export function EquipeLeaveFeedback({
  ok,
  error,
}: {
  ok?: string;
  error?: string;
}) {
  const key = ok ?? error;
  const message = key ? EQUIPE_LEAVE_FEEDBACK[key] : null;
  if (!message) return null;
  const isError = Boolean(error);
  return (
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
      {message}
    </div>
  );
}
