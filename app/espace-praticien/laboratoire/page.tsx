import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase, requireLaboStaff } from "@/lib/supabase/server";
import {
  listLabRequests,
  listLabSectors,
} from "@/lib/requests/queries";
import { formatRequestCategory } from "@/lib/requests/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Laboratoire — Demandes par secteur",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  sector?: string;
  status?: string;
  patient?: string;
}>;

type StatusFilter = "all" | "open" | "closed";

function parseStatus(value: string | undefined): StatusFilter {
  if (value === "all" || value === "open" || value === "closed") return value;
  return "open";
}

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function LaboratoireIndex({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireLaboStaff();
  const {
    sector: rawSector,
    status: rawStatus,
    patient: rawPatient,
  } = await searchParams;
  const status = parseStatus(rawStatus);
  const patientQuery = (rawPatient ?? "").trim();

  const supabase = await getServerSupabase();
  const sectors = await listLabSectors(supabase);

  const isAdmin = profile.role === "admin";
  const defaultSectorId = isAdmin
    ? "all"
    : (profile.sectorId ?? sectors[0]?.id ?? "all");
  const activeSectorId =
    rawSector &&
    (rawSector === "all" || sectors.some((s) => s.id === rawSector))
      ? rawSector
      : defaultSectorId;

  // Un prothésiste ne peut pas naviguer hors de son secteur.
  const sectorFilter =
    !isAdmin && profile.sectorId
      ? profile.sectorId
      : activeSectorId === "all"
        ? "all"
        : activeSectorId;

  const requests = await listLabRequests(supabase, {
    status,
    sectorId: sectorFilter,
    patientQuery: patientQuery || undefined,
  });

  const activeSector = sectors.find((s) => s.id === sectorFilter) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 max-w-3xl">
        <span className="text-eyebrow flex items-center gap-3">
          <span aria-hidden="true" className="h-px w-8 bg-[var(--accent-warm)]" />
          Laboratoire
        </span>
        <h1 className="font-serif text-2xl md:text-3xl text-[var(--ink)] leading-tight">
          {isAdmin
            ? "Demandes par secteur"
            : activeSector
              ? `Secteur ${activeSector.name}`
              : "Mes demandes"}
        </h1>
        <p className="text-sm md:text-base text-[var(--ink-muted)] leading-relaxed">
          {isAdmin
            ? "Vue consolidée des demandes envoyées par les dentistes, organisée par secteur de production."
            : profile.sectorName
              ? `Demandes adressées au secteur ${profile.sectorName}.`
              : "Aucun secteur n’est encore rattaché à votre compte. Contactez un administrateur."}
        </p>
      </header>

      {!isAdmin && !profile.sectorId ? (
        <div className="border-l-2 border-[var(--accent-warm)] pl-4 py-2 bg-[var(--bg-elevated)] text-sm text-[var(--ink)]">
          Votre compte prothésiste n’a pas de secteur. Les demandes ne
          s’afficheront qu’après attribution d’un secteur par un admin.
        </div>
      ) : null}

      {isAdmin ? (
        <nav
          aria-label="Secteurs"
          className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-3"
        >
          <SectorTab
            href={buildHref("all", status, patientQuery)}
            label="Tous"
            active={sectorFilter === "all"}
          />
          {sectors.map((s) => (
            <SectorTab
              key={s.id}
              href={buildHref(s.id, status, patientQuery)}
              label={s.name}
              color={s.color}
              active={sectorFilter === s.id}
            />
          ))}
        </nav>
      ) : null}

      <form
        method="get"
        className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
      >
        {sectorFilter !== "all" ? (
          <input type="hidden" name="sector" value={sectorFilter} />
        ) : null}
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
            href={buildHref(sectorFilter, status, "")}
            className="self-start sm:self-auto px-3 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            Effacer
          </Link>
        ) : null}
      </form>

      <nav
        aria-label="Filtrer par statut"
        className="flex flex-wrap gap-2"
      >
        <StatusTab
          href={buildHref(sectorFilter, "open", patientQuery)}
          label="Ouvertes"
          active={status === "open"}
        />
        <StatusTab
          href={buildHref(sectorFilter, "closed", patientQuery)}
          label="Traitées"
          active={status === "closed"}
        />
        <StatusTab
          href={buildHref(sectorFilter, "all", patientQuery)}
          label="Toutes"
          active={status === "all"}
        />
      </nav>

      {requests.length === 0 ? (
        <div className="border border-dashed border-[var(--line-strong)] px-5 py-10 text-center text-sm text-[var(--ink-muted)] bg-[var(--bg-elevated)]">
          {patientQuery
            ? `Aucune demande pour un patient commençant par « ${patientQuery} ».`
            : "Aucune demande à afficher pour ce filtre."}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => {
            const dentistLabel =
              r.creatorName ?? r.practices?.name ?? "Dentiste inconnu";
            return (
              <li key={r.id}>
                <Link
                  href={`/espace-praticien/laboratoire/${r.id}`}
                  className="block bg-[var(--bg-elevated)] border border-[var(--line)] p-5 md:p-6 hover:border-[var(--line-strong)] transition-colors"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-2 min-w-0">
                      <p className="text-eyebrow tabular-nums">
                        {dateTimeFormatter.format(new Date(r.created_at))}
                      </p>
                      <p className="font-serif text-lg text-[var(--ink)] truncate">
                        {dentistLabel}
                        {r.patientName ? (
                          <span className="text-base text-[var(--ink-muted)] font-sans">
                            {" "}
                            · {r.patientName}
                          </span>
                        ) : null}
                      </p>
                      {r.practices?.name && r.creatorName ? (
                        <p className="text-xs text-[var(--ink-discreet)] truncate">
                          {r.practices.name}
                          {r.practices.city ? ` · ${r.practices.city}` : ""}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          label={formatRequestCategory(r.subject)}
                          warm={r.subject === "Urgence"}
                        />
                        {r.sectorName ? (
                          <Badge
                            label={r.sectorName}
                            color={r.sectorColor}
                          />
                        ) : null}
                      </div>
                      <p className="text-sm text-[var(--ink-muted)] line-clamp-2 leading-relaxed">
                        {r.message}
                      </p>
                    </div>
                    <Badge
                      label={r.status === "open" ? "Ouverte" : "Traitée"}
                      warm={r.status === "open"}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function buildHref(
  sector: string,
  status: StatusFilter,
  patient: string,
): string {
  const params = new URLSearchParams();
  if (sector !== "all") params.set("sector", sector);
  if (status !== "open") params.set("status", status);
  if (patient.trim()) params.set("patient", patient.trim());
  const q = params.toString();
  return q
    ? `/espace-praticien/laboratoire?${q}`
    : "/espace-praticien/laboratoire";
}

function SectorTab({
  href,
  label,
  color,
  active,
}: {
  href: string;
  label: string;
  color?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.16em] border transition-colors",
        active
          ? "border-[var(--ink)] text-[var(--ink)]"
          : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]",
      )}
    >
      {color ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {label}
    </Link>
  );
}

function StatusTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-xs uppercase tracking-[0.16em] px-2 py-1 border-b-2 transition-colors",
        active
          ? "border-[var(--accent-warm)] text-[var(--ink)]"
          : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]",
      )}
    >
      {label}
    </Link>
  );
}

function Badge({
  label,
  warm,
  color,
}: {
  label: string;
  warm?: boolean;
  color?: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] shrink-0",
        warm
          ? "border-[var(--accent-warm)] text-[var(--accent-warm)]"
          : "border-[var(--line-strong)] text-[var(--ink)]",
      )}
    >
      {color ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {label}
    </span>
  );
}
