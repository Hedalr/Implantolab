import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getServerSupabase, requireProsthetist } from "@/lib/supabase/server";
import { addLeaveRequest, deleteLeaveRequest } from "./actions";

export const metadata: Metadata = {
  title: "Mes congés — Espace praticien",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string; detail?: string }>;

type LeaveStatus = "pending" | "approved" | "rejected";

type LeaveRow = {
  id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  note: string | null;
  status: LeaveStatus;
};

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "En attente",
  approved: "Confirmé",
  rejected: "Refusé",
};

const FEEDBACK: Record<string, string> = {
  added: "Demande envoyée. Elle sera prise en compte après validation de l’administrateur.",
  deleted: "Demande de congé annulée.",
  validation: "Les dates saisies sont incomplètes ou invalides.",
  order: "La date de fin doit être postérieure ou égale à la date de début.",
  note: "La note doit contenir au plus 500 caractères.",
  save: "Une erreur est survenue lors de l’enregistrement. Merci de réessayer.",
  delete: "Impossible d’annuler cette demande. Merci de réessayer.",
  profile: "Votre profil est incomplet. Contactez l’administrateur.",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
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

/**
 * Le trigger de conflit renvoie un message du type
 *   "Camille Martin du 2026-07-01 au 2026-07-10"
 * On reformate les dates en français si le pattern est reconnu.
 */
function formatConflictDetail(detail: string | undefined): string {
  if (!detail) return "";
  const match = detail.match(
    /^(.+?)\s+du\s+(\d{4}-\d{2}-\d{2})\s+au\s+(\d{4}-\d{2}-\d{2})$/,
  );
  if (!match) return detail;
  const [, name, start, end] = match;
  return `${name} du ${shortDateFormatter.format(parseDateOnly(start))} au ${shortDateFormatter.format(parseDateOnly(end))}`;
}

export default async function CongesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { userId, profile } = await requireProsthetist();
  const { ok, error, detail } = await searchParams;

  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("leave_requests")
    .select("id, start_date, end_date, days_count, note, status")
    .eq("profile_id", userId)
    .order("start_date", { ascending: true });

  const rows = (data ?? []) as LeaveRow[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const activeRows = rows.filter((r) => r.status !== "rejected");
  const upcoming = activeRows.filter(
    (r) => parseDateOnly(r.end_date).getTime() >= todayTime,
  );
  const past = activeRows
    .filter((r) => parseDateOnly(r.end_date).getTime() < todayTime)
    .reverse();

  const approvedDays = rows
    .filter((r) => r.status === "approved")
    .reduce((acc, r) => acc + r.days_count, 0);
  const pendingDays = rows
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + r.days_count, 0);
  const balance = profile.leaveBalanceDays;
  const remaining = Math.max(balance - approvedDays - pendingDays, 0);

  return (
    <Container size="wide" className="py-12 md:py-16">
      <PageHeader
        title="Mes congés"
        intro="Consultez votre solde et déposez une demande de congé. Elle reste en attente jusqu’à validation par l’administrateur. Deux employés du même secteur ne peuvent pas être en congé simultanément."
      />

      <FeedbackBanner ok={ok} error={error} detail={detail} />

      <SummaryCard
        balance={balance}
        approved={approvedDays}
        pending={pendingDays}
        remaining={remaining}
        sectorName={profile.sectorName}
        sectorColor={profile.sectorColor}
      />

      {balance === 0 ? (
        <div className="mt-8 bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8 max-w-2xl">
          <p className="text-eyebrow text-[var(--accent-warm)]">Solde non défini</p>
          <p className="mt-3 text-[var(--ink)] leading-relaxed">
            L’administrateur n’a pas encore attribué de solde de congés à votre
            compte. Contactez-le pour finaliser la mise en place.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-5">
          <Card>
            <CardHeader
              eyebrow="Formulaire"
              title="Poser un congé"
              description="Sélectionnez une plage de dates. La demande sera examinée par l’administrateur avant confirmation."
            />
            <form
              action={addLeaveRequest}
              className="mt-6 flex flex-col gap-6"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="Date de début" htmlFor="start_date" required>
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    required
                    disabled={balance === 0}
                    className={inputStyle}
                  />
                </FormField>
                <FormField label="Date de fin" htmlFor="end_date" required>
                  <input
                    id="end_date"
                    name="end_date"
                    type="date"
                    required
                    disabled={balance === 0}
                    className={inputStyle}
                  />
                </FormField>
              </div>

              <FormField
                label="Note interne"
                htmlFor="note"
                hint="Facultatif — motif, précision (500 caractères max.)"
              >
                <textarea
                  id="note"
                  name="note"
                  rows={3}
                  maxLength={500}
                  disabled={balance === 0}
                  placeholder="Ex. Congés d’été"
                  className={cn(inputStyle, "resize-none p-3 border")}
                />
              </FormField>

              <div className="pt-2">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={balance === 0}
                >
                  Envoyer la demande
                </Button>
              </div>
            </form>
          </Card>
        </section>

        <div className="lg:col-span-7 flex flex-col gap-8">
          <Card>
            <CardHeader
              eyebrow="À venir"
              title="Prochains congés"
              description={
                upcoming.length === 0
                  ? "Aucune demande à venir."
                  : `${upcoming.length} demande${upcoming.length > 1 ? "s" : ""} à venir.`
              }
            />

            {upcoming.length === 0 ? (
              <EmptyState label="Aucune demande pour l’instant." />
            ) : (
              <ul className="mt-6 flex flex-col divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {upcoming.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-serif text-lg text-[var(--ink)]">
                          {formatRange(row.start_date, row.end_date)}
                        </p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="text-xs text-[var(--ink-discreet)] tracking-wide uppercase">
                        {row.days_count} jour{row.days_count > 1 ? "s" : ""}
                      </p>
                      {row.note ? (
                        <p className="mt-1 text-sm text-[var(--ink-muted)] leading-relaxed">
                          {row.note}
                        </p>
                      ) : null}
                    </div>
                    {row.status === "pending" || row.status === "rejected" ? (
                      <form
                        action={deleteLeaveRequest}
                        className="shrink-0 self-start"
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--accent-warm)] transition-colors"
                        >
                          Annuler
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {past.length > 0 ? (
            <Card>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div>
                    <p className="text-eyebrow">Historique</p>
                    <p className="mt-1 font-serif text-lg text-[var(--ink)]">
                      Congés passés ({past.length})
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] group-open:hidden"
                  >
                    Afficher
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden text-xs tracking-wide uppercase text-[var(--ink-discreet)] group-open:inline"
                  >
                    Masquer
                  </span>
                </summary>
                <ul className="mt-5 flex flex-col divide-y divide-[var(--line)] border-t border-[var(--line)] text-sm">
                  {past.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                    >
                      <span className="text-[var(--ink)]">
                        {formatRange(row.start_date, row.end_date)}
                      </span>
                      <span className="text-[var(--ink-discreet)] sm:text-right">
                        {STATUS_LABEL[row.status]} · {row.days_count} jour
                        {row.days_count > 1 ? "s" : ""}
                        {row.note ? ` — ${row.note}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </Card>
          ) : null}
        </div>
      </div>
    </Container>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <span
      className={cn(
        "text-[10px] tracking-wide uppercase px-2 py-0.5 border",
        status === "pending" &&
          "border-[var(--accent-warm)] text-[var(--accent-warm)]",
        status === "approved" &&
          "border-[var(--line-strong)] text-[var(--ink-muted)]",
        status === "rejected" &&
          "border-[var(--line)] text-[var(--ink-discreet)]",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function SummaryCard({
  balance,
  approved,
  pending,
  remaining,
  sectorName,
  sectorColor,
}: {
  balance: number;
  approved: number;
  pending: number;
  remaining: number;
  sectorName: string | null;
  sectorColor: string | null;
}) {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 bg-[var(--bg-elevated)] border border-[var(--line)] p-5 md:p-6">
      <SummaryItem label="Secteur">
        <div className="mt-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 shrink-0 border border-[var(--line-strong)]"
            style={{ backgroundColor: sectorColor ?? "transparent" }}
          />
          <span className="text-lg text-[var(--ink)]">
            {sectorName ?? "Non classé"}
          </span>
        </div>
      </SummaryItem>
      <SummaryItem label="Solde total">
        <p className="mt-1 text-lg text-[var(--ink)] text-numeral">
          {balance} jour{balance > 1 ? "s" : ""}
        </p>
      </SummaryItem>
      <SummaryItem label="Confirmés">
        <p className="mt-1 text-lg text-[var(--ink)] text-numeral">
          {approved} jour{approved > 1 ? "s" : ""}
        </p>
      </SummaryItem>
      <SummaryItem label="En attente">
        <p className="mt-1 text-lg text-[var(--accent-warm)] text-numeral">
          {pending} jour{pending > 1 ? "s" : ""}
        </p>
      </SummaryItem>
      <SummaryItem label="Restants">
        <p className="mt-1 text-lg text-[var(--ink)] text-numeral">
          {remaining} jour{remaining > 1 ? "s" : ""}
        </p>
      </SummaryItem>
    </section>
  );
}

function SummaryItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-eyebrow">{label}</span>
      {children}
    </div>
  );
}

const inputStyle = cn(
  "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
  "disabled:opacity-50 disabled:cursor-not-allowed",
);

function PageHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="flex flex-col gap-3 max-w-3xl">
      <span className="text-eyebrow flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-px w-8 bg-[var(--accent-warm)]"
        />
        Espace praticien
      </span>
      <h1 className="font-serif text-2xl md:text-3xl text-[var(--ink)] leading-tight">
        {title}
      </h1>
      <p className="text-sm md:text-base text-[var(--ink-muted)] leading-relaxed">
        {intro}
      </p>
    </header>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8">
      {children}
    </div>
  );
}

function CardHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-eyebrow">{eyebrow}</span>
      <h2 className="font-serif text-xl text-[var(--ink)]">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-[var(--ink-discreet)] leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-eyebrow">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <span className="text-xs text-[var(--ink-discreet)]">{hint}</span>
      ) : null}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="mt-6 border border-dashed border-[var(--line-strong)] px-5 py-8 text-center text-sm text-[var(--ink-muted)]">
      {label}
    </div>
  );
}

function FeedbackBanner({
  ok,
  error,
  detail,
}: {
  ok?: string;
  error?: string;
  detail?: string;
}) {
  const key = ok ?? error;
  if (!key) return null;

  let message: string;
  if (key === "balance") {
    message = detail
      ? `Solde insuffisant : il vous reste ${detail}.`
      : "Solde de congés insuffisant pour cette période.";
  } else if (key === "conflict") {
    const formatted = formatConflictDetail(detail);
    message = formatted
      ? `Ce créneau chevauche le congé de ${formatted}. Choisissez une autre période.`
      : "Ce créneau chevauche déjà le congé d’un collègue de votre secteur.";
  } else {
    message =
      FEEDBACK[key] ?? (ok ? "Opération réussie." : "Une erreur est survenue.");
  }

  const isError = Boolean(error);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mt-8 border-l pl-4 py-2 bg-[var(--bg-elevated)] text-sm text-[var(--ink)]",
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
