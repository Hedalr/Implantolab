import Link from "next/link";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import { markRequestClosed, markRequestOpen } from "./actions";

export const dynamic = "force-dynamic";

type RequestRow = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  practices: { name: string | null; city: string | null } | null;
  profiles: { full_name: string | null; email: string | null } | null;
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
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await requireAdmin();
  const { status: rawStatus } = await searchParams;
  const status = parseStatus(rawStatus);

  const supabase = await getServerSupabase();
  let query = supabase
    .from("requests")
    .select(
      "id, subject, message, status, created_at, practices(name, city), profiles(full_name, email)",
    )
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  const requests = (data ?? []) as unknown as RequestRow[];

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
            Aucune demande à afficher pour ce filtre.
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
                <Th>Sujet</Th>
                <Th className="w-28">Statut</Th>
                <Th className="w-40 text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <RequestRowView key={r.id} row={r} statusFilter={status} />
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
}: {
  current: StatusFilter;
  target: StatusFilter;
  label: string;
}) {
  const active = current === target;
  return (
    <Link
      href={`/espace-praticien/admin/demandes?status=${target}`}
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
  statusFilter,
}: {
  row: RequestRow;
  statusFilter: StatusFilter;
}) {
  const practiceLabel = row.practices?.name ?? "—";
  const practitionerLabel =
    row.profiles?.full_name ?? row.profiles?.email ?? "—";

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
        <td className="px-4 py-3 border-b border-[var(--line)]">
          <details className="group">
            <summary className="cursor-pointer list-none text-[var(--ink)] hover:text-[var(--accent-warm)]">
              <span className="font-medium">{row.subject}</span>
              <span className="ml-2 text-xs text-[var(--ink-discreet)] group-open:hidden">
                Voir le message
              </span>
              <span className="ml-2 text-xs text-[var(--ink-discreet)] hidden group-open:inline">
                Masquer
              </span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--ink-muted)] max-w-2xl">
              {row.message}
            </p>
          </details>
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
