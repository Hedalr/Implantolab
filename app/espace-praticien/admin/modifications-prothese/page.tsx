import Link from "next/link";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import {
  fetchRequestMediaItems,
  LAB_REQUESTS_PAGE_SIZE,
  listAdminRequests,
  parseRequestStatusFilter,
  type AdminRequestRow,
  type RequestStatusFilter,
} from "@/lib/requests/queries";
import {
  MODIFICATION_PROTHESE_CATEGORY,
} from "@/lib/requests/types";
import { getPatientFilter } from "@/lib/requests/patient-filter";
import { PatientSearchForm } from "@/components/requests/PatientSearchForm";
import { Container } from "@/components/ui/Container";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import {
  RequestMediaGallery,
  type RequestMediaItem,
} from "@/components/requests/RequestMediaGallery";
import { markRequestClosed, markRequestOpen } from "./actions";

export const dynamic = "force-dynamic";

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function buildHref(status: RequestStatusFilter, page = 1): string {
  const params = new URLSearchParams();
  if (status !== "open") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const q = params.toString();
  return q
    ? `/espace-praticien/admin/modifications-prothese?${q}`
    : "/espace-praticien/admin/modifications-prothese";
}

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminModificationsProthesePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    page?: string | string[];
  }>;
}) {
  await requireAdmin();
  const { status: rawStatus, page: rawPage } = await searchParams;
  const status = parseRequestStatusFilter(rawStatus);
  const patientQuery = await getPatientFilter("adminProthese");
  const page = parsePage(rawPage);

  const supabase = await getServerSupabase();
  const {
    rows: requests,
    total,
    pageSize,
    totalPages,
    page: currentPage,
  } = await listAdminRequests(supabase, {
    status,
    patientQuery: patientQuery || undefined,
    page,
    pageSize: LAB_REQUESTS_PAGE_SIZE,
    subjects: [MODIFICATION_PROTHESE_CATEGORY],
  });

  const mediaByRequest = await fetchRequestMediaItems(
    supabase,
    requests.map((r) => r.id),
  );

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          {MODIFICATION_PROTHESE_CATEGORY}
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Historique des demandes envoyées automatiquement par email pour
          impression d’étiquette. Elles n’apparaissent plus dans le Laboratoire.
        </p>
      </header>

      <PatientSearchForm
        scope="adminProthese"
        redirectTo={buildHref(status)}
        defaultValue={patientQuery}
        className="mb-6"
      />

      <nav
        aria-label="Filtrer par statut"
        className="mb-6 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3"
      >
        <TabLink current={status} target="open" label="Ouvertes" />
        <TabLink current={status} target="closed" label="Traitées" />
        <TabLink current={status} target="all" label="Toutes" />
      </nav>

      {requests.length === 0 ? (
        <div className="bg-[var(--bg-elevated)] border border-[var(--line)] p-10 text-center">
          <p className="text-sm text-[var(--ink-discreet)]">
            {patientQuery
              ? `Aucune modification prothèse pour un patient commençant par « ${patientQuery} ».`
              : "Aucune demande de modification prothèse pour ce filtre."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-[var(--bg-elevated)] border border-[var(--line)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <Th className="w-32">Date</Th>
                  <Th>Praticien</Th>
                  <Th>Patient</Th>
                  <Th>Message</Th>
                  <Th>Secteur</Th>
                  <Th className="w-28">Statut</Th>
                  <Th className="w-40 text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <RequestRowView
                    key={r.id}
                    row={r}
                    media={mediaByRequest.get(r.id) ?? []}
                    statusFilter={status}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            hrefForPage={(p) => buildHref(status, p)}
          />
        </div>
      )}
    </Container>
  );
}

function TabLink({
  current,
  target,
  label,
}: {
  current: RequestStatusFilter;
  target: RequestStatusFilter;
  label: string;
}) {
  const active = current === target;
  return (
    <Link
      href={buildHref(target)}
      className={cn(
        "px-3 py-1.5 text-sm border transition-colors",
        active
          ? "border-[var(--ink)] text-[var(--ink)] bg-[var(--bg-elevated)]"
          : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]",
      )}
    >
      {label}
    </Link>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "text-eyebrow text-left px-4 py-3 border-b border-[var(--line)]",
        className,
      )}
    >
      {children}
    </th>
  );
}

function RequestRowView({
  row,
  media,
  statusFilter,
}: {
  row: AdminRequestRow;
  media: RequestMediaItem[];
  statusFilter: RequestStatusFilter;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3 border-b border-[var(--line)] text-numeral text-xs text-[var(--ink-muted)]">
        {dateTimeFormatter.format(new Date(row.created_at))}
      </td>
      <td className="px-4 py-3 border-b border-[var(--line)] text-[var(--ink)]">
        {row.creatorName ?? "—"}
      </td>
      <td className="px-4 py-3 border-b border-[var(--line)] text-[var(--ink)]">
        {row.patientName ?? "—"}
      </td>
      <td className="px-4 py-3 border-b border-[var(--line)] text-[var(--ink-muted)] max-w-md">
        <p className="whitespace-pre-wrap leading-relaxed">{row.message}</p>
        {media.length > 0 ? (
          <div className="mt-2">
            <RequestMediaGallery media={media} />
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3 border-b border-[var(--line)] text-[var(--ink-muted)]">
        {row.sectorName ?? "—"}
      </td>
      <td className="px-4 py-3 border-b border-[var(--line)]">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-4 py-3 border-b border-[var(--line)] text-right">
        <RequestActionForm row={row} statusFilter={statusFilter} />
      </td>
    </tr>
  );
}

function RequestActionForm({
  row,
  statusFilter,
}: {
  row: AdminRequestRow;
  statusFilter: RequestStatusFilter;
}) {
  const action = row.status === "open" ? markRequestClosed : markRequestOpen;
  const label = row.status === "open" ? "Marquer traité" : "Rouvrir";

  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="status" value={statusFilter} />
      <button
        type="submit"
        className={cn(
          "inline-flex items-center px-3 py-1.5 text-xs border transition-colors",
          "border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--bg)]",
        )}
      >
        {label}
      </button>
    </form>
  );
}

function StatusBadge({ status }: { status: "open" | "closed" }) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]">
        Ouverte
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase bg-[var(--ink-discreet)]/10 text-[var(--ink-discreet)]">
      Traitée
    </span>
  );
}
