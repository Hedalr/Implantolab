import Link from "next/link";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { listAdminRequests } from "@/lib/requests/queries";
import { formatRequestCategory } from "@/lib/requests/types";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import { RequestMediaGallery } from "@/components/requests/RequestMediaGallery";
import { markRequestClosed, markRequestOpen } from "./actions";

export const dynamic = "force-dynamic";

type RequestRow = Awaited<ReturnType<typeof listAdminRequests>>[number];

type RequestMediaRow = {
  id: string;
  request_id: string;
  original_filename: string | null;
  mime_type: string | null;
};

type StatusFilter = "all" | "open" | "closed";

function parseStatus(value: string | string[] | undefined): StatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "all" || raw === "open" || raw === "closed") return raw;
  return "open";
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
  searchParams: Promise<{ status?: string | string[]; patient?: string | string[] }>;
}) {
  await requireAdmin();
  const { status: rawStatus, patient: rawPatient } = await searchParams;
  const status = parseStatus(rawStatus);
  const patientQuery = (
    Array.isArray(rawPatient) ? rawPatient[0] : rawPatient
  )?.trim() ?? "";

  const supabase = await getServerSupabase();
  const requests = await listAdminRequests(
    supabase,
    status,
    undefined,
    patientQuery || undefined,
  );

  const requestIds = requests.map((r) => r.id);
  const { data: mediaData } =
    requestIds.length > 0
      ? await supabase
          .from("request_media")
          .select("id, request_id, original_filename, mime_type")
          .in("request_id", requestIds)
      : { data: [] as RequestMediaRow[] };
  const mediaRows = (mediaData ?? []) as RequestMediaRow[];
  const mediaByRequest = new Map<string, RequestMediaRow[]>();
  for (const media of mediaRows) {
    const list = mediaByRequest.get(media.request_id) ?? [];
    list.push(media);
    mediaByRequest.set(media.request_id, list);
  }

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Demandes praticiens
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Suivi et traitement des demandes envoyées par les cabinets partenaires.
        </p>
      </header>

      <form
        method="get"
        className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
      >
        {status !== "open" ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        <label className="flex flex-col gap-1.5 flex-1 max-w-md">
          <span className="text-eyebrow">Patient</span>
          <input
            type="search"
            name="patient"
            defaultValue={patientQuery}
            placeholder="Début du nom du patient…"
            autoComplete="off"
            className={cn(
              "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
              "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
            )}
          />
        </label>
        <button
          type="submit"
          className="self-start sm:self-auto px-4 py-2.5 text-xs uppercase tracking-[0.16em] border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
        >
          Rechercher
        </button>
        {patientQuery ? (
          <Link
            href={`/espace-praticien/admin/demandes?status=${status}`}
            className="self-start sm:self-auto px-3 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            Effacer
          </Link>
        ) : null}
      </form>

      <nav
        aria-label="Filtrer par statut"
        className="mb-6 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3"
      >
        <TabLink current={status} target="open" label="Ouvertes" patient={patientQuery} />
        <TabLink current={status} target="closed" label="Traitées" patient={patientQuery} />
        <TabLink current={status} target="all" label="Toutes" patient={patientQuery} />
      </nav>

      {requests.length === 0 ? (
        <div className="bg-[var(--bg-elevated)] border border-[var(--line)] p-10 text-center">
          <p className="text-sm text-[var(--ink-discreet)]">
            {patientQuery
              ? `Aucune demande pour un patient commençant par « ${patientQuery} ».`
              : "Aucune demande à afficher pour ce filtre."}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--bg-elevated)] border border-[var(--line)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th className="w-32">Date</Th>
                <Th>Cabinet</Th>
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
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}

function TabLink({
  current,
  target,
  label,
  patient,
}: {
  current: StatusFilter;
  target: StatusFilter;
  label: string;
  patient?: string;
}) {
  const active = current === target;
  const params = new URLSearchParams({ status: target });
  if (patient?.trim()) params.set("patient", patient.trim());
  return (
    <Link
      href={`/espace-praticien/admin/demandes?${params.toString()}`}
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
  row: RequestRow;
  media: RequestMediaRow[];
  statusFilter: StatusFilter;
}) {
  const practiceLabel = row.practices?.name ?? "—";
  const practitionerLabel = row.creatorName ?? "—";

  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-3 border-b border-[var(--line)] text-numeral text-xs text-[var(--ink-muted)]">
          {dateTimeFormatter.format(new Date(row.created_at))}
        </td>
        <td className="px-4 py-3 border-b border-[var(--line)] text-[var(--ink)]">
          {practiceLabel}
          {row.practices?.city ? (
            <span className="block text-xs text-[var(--ink-discreet)]">
              {row.practices.city}
            </span>
          ) : null}
        </td>
        <td className="px-4 py-3 border-b border-[var(--line)] text-[var(--ink-muted)]">
          {practitionerLabel}
        </td>
        <td className="px-4 py-3 border-b border-[var(--line)] text-[var(--ink)]">
          {row.patientName ?? "—"}
        </td>
        <td className="px-4 py-3 border-b border-[var(--line)]">
          <CategoryBadge category={row.subject} />
          <details className="group mt-2">
            <summary className="cursor-pointer list-none text-[var(--ink)] hover:text-[var(--accent-warm)]">
              <span className="text-xs text-[var(--ink-discreet)] group-open:hidden">
                Voir le message{media.length > 0 ? ` (${media.length} photo${media.length > 1 ? "s" : ""})` : ""}
              </span>
              <span className="text-xs text-[var(--ink-discreet)] hidden group-open:inline">
                Masquer
              </span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--ink-muted)] max-w-2xl">
              {row.message}
            </p>
            <RequestMediaGallery
              media={media.map((m) => ({
                id: m.id,
                filename: m.original_filename,
                mimeType: m.mime_type,
              }))}
            />
          </details>
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
    </>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const isUrgent = category === "Urgence";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase",
        isUrgent
          ? "bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]"
          : "bg-[var(--ink-discreet)]/10 text-[var(--ink-discreet)]",
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
