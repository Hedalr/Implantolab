import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase, requireLaboStaff } from "@/lib/supabase/server";
import {
  countPendingReview,
  listCases,
  type CaseListFilters,
} from "@/lib/labo/queries";
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  type CasePriority,
  type CaseStatus,
} from "@/lib/labo/types";
import { formatPhoneForDisplay } from "@/lib/labo/phone";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Laboratoire — Dossiers patient",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  q?: string;
  status?: string;
  review?: string;
}>;

const STATUS_TABS: { key: CaseStatus | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "pending_review", label: "À valider" },
  { key: "received", label: "Reçus" },
  { key: "in_progress", label: "En cours" },
  { key: "waiting_info", label: "Info manquante" },
  { key: "completed", label: "Terminés" },
  { key: "delivered", label: "Livrés" },
];

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return dateTimeFormatter.format(new Date(iso));
}

export default async function LaboratoireIndex({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireLaboStaff();
  const { q, status, review } = await searchParams;

  const filters: CaseListFilters = {
    search: q,
    status: (status as CaseStatus | "all" | undefined) ?? "all",
    needsReviewOnly: review === "1",
  };

  const supabase = await getServerSupabase();
  const [cases, pendingReview] = await Promise.all([
    listCases(supabase, filters),
    countPendingReview(supabase),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 max-w-3xl">
        <span className="text-eyebrow flex items-center gap-3">
          <span aria-hidden="true" className="h-px w-8 bg-[var(--accent-warm)]" />
          Laboratoire
        </span>
        <h1 className="font-serif text-2xl md:text-3xl text-[var(--ink)] leading-tight">
          Dossiers patient
        </h1>
        <p className="text-sm md:text-base text-[var(--ink-muted)] leading-relaxed">
          Tous les cas reçus par WhatsApp, classés par dentiste et patient.
          Aucun besoin de demander à Antoine : ouvre un dossier pour trouver
          photos, message d’origine et fiche patient.
        </p>
      </header>

      {pendingReview > 0 ? (
        <div className="border-l-2 border-[var(--accent-warm)] pl-4 py-2 bg-[var(--bg-elevated)] text-sm text-[var(--ink)]">
          <span className="text-eyebrow text-[var(--accent-warm)] mr-3">
            À valider
          </span>
          <Link
            href="/espace-praticien/laboratoire?review=1"
            className="underline underline-offset-4 decoration-[var(--line-strong)] hover:decoration-[var(--ink)]"
          >
            {pendingReview} dossier{pendingReview > 1 ? "s" : ""} en attente de
            validation par un admin
          </Link>
        </div>
      ) : null}

      <form className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex flex-col gap-1 md:flex-1">
          <span className="text-eyebrow">Rechercher</span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Patient, dentiste, N° CAS, téléphone…"
            className="w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)]"
          />
        </label>
        <div className="flex items-center gap-3">
          {review === "1" ? (
            <input type="hidden" name="review" value="1" />
          ) : null}
          <button
            type="submit"
            className="border border-[var(--line-strong)] px-4 py-2 text-xs uppercase tracking-wide hover:border-[var(--ink)]"
          >
            Filtrer
          </button>
          {(q || status || review) && (
            <Link
              href="/espace-praticien/laboratoire"
              className="text-xs text-[var(--ink-discreet)] hover:text-[var(--ink)]"
            >
              Réinitialiser
            </Link>
          )}
        </div>
      </form>

      <nav
        aria-label="Filtre par statut"
        className="flex items-center gap-2 flex-wrap border-b border-[var(--line)] pb-3"
      >
        {STATUS_TABS.map((tab) => {
          const isActive =
            (tab.key === "all" && !status) || status === tab.key;
          const href =
            tab.key === "all"
              ? { pathname: "/espace-praticien/laboratoire", query: q ? { q } : {} }
              : {
                  pathname: "/espace-praticien/laboratoire",
                  query: q ? { q, status: tab.key } : { status: tab.key },
                };
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors",
                isActive
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-[var(--line)] text-[var(--ink-discreet)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {cases.length === 0 ? (
        <div className="border border-dashed border-[var(--line-strong)] px-5 py-16 text-center text-sm text-[var(--ink-muted)] bg-[var(--bg-elevated)]">
          Aucun dossier ne correspond à ces filtres.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                href={`/espace-praticien/laboratoire/${c.id}`}
                className="block bg-[var(--bg-elevated)] border border-[var(--line)] hover:border-[var(--line-strong)] p-5 md:p-6 transition-colors"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-eyebrow tabular-nums">
                        {c.caseNumber}
                      </span>
                      <PriorityBadge priority={c.priority} />
                      <StatusBadge status={c.status} />
                      {c.needsReview ? <ReviewBadge /> : null}
                    </div>
                    <h2 className="font-serif text-lg text-[var(--ink)] truncate">
                      {c.patientName ?? (
                        <span className="text-[var(--ink-discreet)]">
                          Patient non identifié
                        </span>
                      )}
                    </h2>
                    <div className="text-xs text-[var(--ink-muted)] flex items-center gap-3 flex-wrap">
                      <span>
                        {c.dentistNameRaw ??
                          formatPhoneForDisplay(c.dentistPhoneE164) ??
                          "Dentiste inconnu"}
                      </span>
                      {c.workType ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{c.workType}</span>
                        </>
                      ) : null}
                    </div>
                    {c.description ? (
                      <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed line-clamp-2">
                        {c.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--ink-discreet)] tabular-nums shrink-0">
                    {formatDateTime(c.lastMessageAt ?? c.createdAt)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: CasePriority }) {
  const isUrgent = priority === "urgent" || priority === "high";
  if (priority === "normal") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em]",
        isUrgent
          ? "border-[var(--accent-warm)] text-[var(--accent-warm)]"
          : "border-[var(--line-strong)] text-[var(--ink-discreet)]",
      )}
    >
      {CASE_PRIORITY_LABELS[priority]}
    </span>
  );
}

function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className="inline-flex items-center border border-[var(--line-strong)] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
      {CASE_STATUS_LABELS[status]}
    </span>
  );
}

function ReviewBadge() {
  return (
    <span className="inline-flex items-center gap-1 border border-[var(--accent-warm)] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-[var(--accent-warm)]">
      <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--accent-warm)]" />
      À valider
    </span>
  );
}
