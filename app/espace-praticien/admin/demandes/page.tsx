import Link from "next/link";
import {
  getServerSupabase,
  requireAdminOrChef,
} from "@/lib/supabase/server";
import {
  fetchRequestMediaItems,
  LAB_REQUESTS_PAGE_SIZE,
  listAdminRequests,
  countUnreadByRequestIds,
  parseRequestStatusFilter,
  type AdminRequestRow,
  type RequestStatusFilter,
} from "@/lib/requests/queries";
import {
  formatRequestCategory,
  REQUEST_INBOX_LABEL,
  REQUEST_INBOX_SUBJECTS,
} from "@/lib/requests/types";
import { getPatientFilter } from "@/lib/requests/patient-filter";
import { PatientSearchForm } from "@/components/requests/PatientSearchForm";
import { Container } from "@/components/ui/Container";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { type RequestMediaItem } from "@/components/requests/RequestMediaGallery";
import { UnreadBadge } from "@/components/requests/UnreadBadge";
import { RequestChatDetails } from "@/components/requests/RequestChatDetails";
import { markRequestClosed, markRequestOpen } from "./actions";

export const dynamic = "force-dynamic";

type RequestRow = AdminRequestRow;

type StatusFilter = RequestStatusFilter;

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function buildAdminDemandesHref(status: StatusFilter, page = 1): string {
  const params = new URLSearchParams();
  if (status !== "open") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const q = params.toString();
  return q
    ? `/espace-praticien/admin/demandes?${q}`
    : "/espace-praticien/admin/demandes";
}

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    page?: string | string[];
  }>;
}) {
  const { profile } = await requireAdminOrChef();
  const isChef = profile.role === "chef_de_secteur";
  const { status: rawStatus, page: rawPage } = await searchParams;
  const status = parseRequestStatusFilter(rawStatus);
  const patientQuery = await getPatientFilter("adminDemandes");
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
    subjects: REQUEST_INBOX_SUBJECTS,
    ...(isChef ? { sectorId: profile.sectorId ?? undefined } : {}),
  });

  const mediaByRequest = await fetchRequestMediaItems(
    supabase,
    requests.map((r) => r.id),
  );
  const unreadByRequest = await countUnreadByRequestIds(
    supabase,
    requests.map((r) => r.id),
    profile.id,
  );

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-eyebrow">
          {isChef ? "Chef de secteur" : "Administration"}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          {REQUEST_INBOX_LABEL}
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          {isChef
            ? `Questions et urgences du secteur ${profile.sectorName ?? "assigné"}.`
            : "Questions et urgences envoyées par les dentistes partenaires."}
        </p>
      </header>

      <PatientSearchForm
        scope="adminDemandes"
        redirectTo={buildAdminDemandesHref(status)}
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
              ? `Aucune question/urgence pour un patient commençant par « ${patientQuery} ».`
              : "Aucune question ou urgence à afficher pour ce filtre."}
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
                  <Th>Catégorie</Th>
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
                    currentUserId={profile.id}
                    unreadCount={unreadByRequest.get(r.id) ?? 0}
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
            hrefForPage={(p) => buildAdminDemandesHref(status, p)}
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
  current: StatusFilter;
  target: StatusFilter;
  label: string;
}) {
  const active = current === target;
  return (
    <Link
      href={buildAdminDemandesHref(target)}
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
  currentUserId,
  unreadCount,
}: {
  row: RequestRow;
  media: RequestMediaItem[];
  statusFilter: StatusFilter;
  currentUserId: string;
  unreadCount: number;
}) {
  const practitionerLabel = row.creatorName ?? "—";

  return (
    <tr className="align-top">
      <td className="px-4 py-3 border-b border-[var(--line)] text-numeral text-xs text-[var(--ink-muted)]">
        {dateTimeFormatter.format(new Date(row.created_at))}
      </td>
      <td className="px-4 py-3 border-b border-[var(--line)] text-[var(--ink)]">
        <span className="inline-flex items-center gap-2">
          {practitionerLabel}
          <UnreadBadge count={unreadCount} />
        </span>
      </td>
      <td className="px-4 py-3 border-b border-[var(--line)] text-[var(--ink)]">
        {row.patientName ?? "—"}
      </td>
      <td className="px-4 py-3 border-b border-[var(--line)]">
        <RequestChatDetails
          requestId={row.id}
          currentUserId={currentUserId}
          initialBody={row.message}
          initialCreatedAt={row.created_at}
          initialAuthorName={row.creatorName}
          status={row.status}
          media={media}
          unreadCount={unreadCount}
          trigger={<CategoryBadge category={row.subject} />}
        />
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

function CategoryBadge({ category }: { category: string }) {
  const isUrgent = category === "Urgence";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase border",
        isUrgent
          ? "border-red-500 bg-red-500/10 text-red-700"
          : "border-amber-500 bg-amber-500/10 text-amber-700",
      )}
    >
      {formatRequestCategory(category)}
    </span>
  );
}

function RequestActionForm({
  row,
  statusFilter,
}: {
  row: RequestRow;
  statusFilter: StatusFilter;
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
