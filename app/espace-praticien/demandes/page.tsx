import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import {
  REQUEST_CATEGORIES,
  formatRequestCategory,
} from "@/lib/requests/types";
import { listLabSectors } from "@/lib/requests/queries";
import { RequestMediaGallery } from "@/components/requests/RequestMediaGallery";
import { createRequest } from "./actions";

export const metadata: Metadata = {
  title: "Mes demandes — Espace praticien",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ ok?: string; error?: string }>;

type RequestRow = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  patient_name: string | null;
  sector_id: string | null;
  sectors: { name: string | null; color: string | null } | null;
};

type RequestMediaRow = {
  id: string;
  request_id: string;
  original_filename: string | null;
  mime_type: string | null;
};

const FEEDBACK_MESSAGES: Record<string, string> = {
  sent: "Votre demande a bien été transmise au laboratoire.",
  subject: "Merci de choisir une catégorie.",
  sector: "Merci de choisir un secteur (Numérique, Amovible ou Conjoint).",
  patient: "Merci d’indiquer le nom du patient (2 à 120 caractères).",
  message: "Le message doit contenir entre 10 et 2000 caractères.",
  save: "Une erreur est survenue lors de l’envoi. Merci de réessayer.",
  "no-practice":
    "Votre cabinet n’est pas encore rattaché à votre compte.",
  "too-many-photos": "Vous pouvez joindre jusqu’à 6 photos maximum.",
  "photo-size": "Chaque photo doit peser moins de 5 Mo.",
  "photo-type": "Formats acceptés pour les photos : JPG, PNG, WEBP, HEIC.",
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso));
}

export default async function DemandesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const { ok, error } = await searchParams;

  const practiceLabel = profile.practiceName ?? "votre cabinet";

  if (!profile.practiceId) {
    return (
      <Container size="wide" className="py-12 md:py-16">
        <PageHeader
          title={`Mes demandes — ${practiceLabel}`}
          intro="Adressez toute demande particulière au laboratoire : dates atypiques, urgences, questions techniques."
        />
        <div className="mt-10 bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8 max-w-2xl">
          <p className="text-eyebrow text-[var(--accent-warm)]">Accès partiel</p>
          <p className="mt-3 text-[var(--ink)] leading-relaxed">
            Votre cabinet n’a pas encore été rattaché à votre compte. Merci de
            contacter le laboratoire pour finaliser votre accès à l’espace
            praticien.
          </p>
          <p className="mt-5 text-sm">
            <a
              href="mailto:contact@implantolab.fr"
              className="text-[var(--ink)] underline underline-offset-4 decoration-[var(--line-strong)] hover:decoration-[var(--ink)] hover:text-[var(--accent-warm)] transition-colors"
            >
              contact@implantolab.fr
            </a>
          </p>
        </div>
      </Container>
    );
  }

  const supabase = await getServerSupabase();
  const [sectors, requestsRes] = await Promise.all([
    listLabSectors(supabase),
    supabase
      .from("requests")
      .select(
        "id, subject, message, status, created_at, patient_name, sector_id, sectors ( name, color )",
      )
      .eq("practice_id", profile.practiceId)
      .order("created_at", { ascending: false }),
  ]);

  const rows = (requestsRes.data ?? []) as unknown as RequestRow[];
  const openRows = rows.filter((r) => r.status === "open");
  const closedRows = rows.filter((r) => r.status === "closed");

  const requestIds = rows.map((r) => r.id);
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
    <Container size="wide" className="py-12 md:py-16">
      <PageHeader
        title={`Mes demandes — ${practiceLabel}`}
        intro="Adressez toute demande particulière au laboratoire : dates atypiques, urgences, questions techniques."
      />

      <FeedbackBanner ok={ok} error={error} />

      <div className="mt-8 flex flex-col gap-8">
        <Card>
          <CardHeader
            eyebrow="Formulaire"
            title="Nouvelle demande"
            description="Décrivez votre demande. Notre équipe vous répond dans les meilleurs délais."
          />
          <form action={createRequest} className="mt-6 flex flex-col gap-6">
            <FormField label="Catégorie" htmlFor="subject" required>
              <select
                id="subject"
                name="subject"
                required
                defaultValue=""
                className={inputStyle}
              >
                <option value="" disabled>
                  Choisir une catégorie…
                </option>
                {REQUEST_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Secteur"
              htmlFor="sector_id"
              required
              hint="Votre demande sera transmise à l’équipe du secteur choisi."
            >
              <select
                id="sector_id"
                name="sector_id"
                required
                defaultValue=""
                className={inputStyle}
              >
                <option value="" disabled>
                  Choisir un secteur…
                </option>
                {sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Patient"
              htmlFor="patient_name"
              required
              hint="Nom du patient concerné par cette demande."
            >
              <input
                id="patient_name"
                name="patient_name"
                type="text"
                required
                minLength={2}
                maxLength={120}
                autoComplete="off"
                placeholder="Nom du patient…"
                className={inputStyle}
              />
            </FormField>

            <FormField
              label="Message"
              htmlFor="message"
              required
              hint="Précisez le contexte, les dates concernées et les pièces éventuellement transmises par ailleurs (10 à 2000 caractères)."
            >
              <textarea
                id="message"
                name="message"
                required
                minLength={10}
                maxLength={2000}
                rows={6}
                placeholder="Détaillez votre demande…"
                className={cn(inputStyle, "resize-y p-3 border")}
              />
            </FormField>

            <FormField
              label="Photos"
              htmlFor="photos"
              hint="Facultatif — jusqu’à 6 photos (JPG, PNG, WEBP, HEIC), 5 Mo max par fichier."
            >
              <input
                id="photos"
                name="photos"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className={cn(
                  inputStyle,
                  "cursor-pointer file:mr-4 file:border-0 file:bg-transparent file:text-sm file:tracking-wide file:text-[var(--ink)]",
                )}
              />
            </FormField>

            <div className="pt-2">
              <Button variant="primary" type="submit">
                Envoyer
              </Button>
            </div>
          </form>
        </Card>

        <section className="flex flex-col gap-4">
          <SectionHeading
            eyebrow="Suivi"
            title="Demandes en cours"
            count={openRows.length}
          />
          {openRows.length === 0 ? (
            <EmptyState label="Aucune demande adressée pour l’instant." />
          ) : (
            <ul className="flex flex-col gap-4">
              {openRows.map((row) => (
                <li key={row.id}>
                  <RequestCard row={row} media={mediaByRequest.get(row.id) ?? []} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {closedRows.length > 0 ? (
          <section className="flex flex-col gap-4">
            <SectionHeading
              eyebrow="Archives"
              title="Demandes traitées"
              count={closedRows.length}
            />
            <Card>
              <ul className="flex flex-col divide-y divide-[var(--line)]">
                {closedRows.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 text-sm"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="text-[var(--ink-discreet)] tabular-nums">
                        {formatShortDate(row.created_at)}
                      </span>
                      <span className="text-[var(--ink)]">
                        {formatRequestCategory(row.subject)}
                        {row.patient_name ? ` · ${row.patient_name}` : ""}
                      </span>
                    </div>
                    <StatusBadge status="closed" />
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}
      </div>
    </Container>
  );
}

const inputStyle = cn(
  "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
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

function SectionHeading({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] pb-3">
      <div className="flex flex-col gap-1">
        <span className="text-eyebrow">{eyebrow}</span>
        <h2 className="font-serif text-xl text-[var(--ink)]">{title}</h2>
      </div>
      <span className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] tabular-nums">
        {count} {count > 1 ? "demandes" : "demande"}
      </span>
    </div>
  );
}

function RequestCard({
  row,
  media,
}: {
  row: RequestRow;
  media: RequestMediaRow[];
}) {
  return (
    <article className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-eyebrow tabular-nums">
            {formatDateTime(row.created_at)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={row.subject} />
            {row.sectors?.name ? (
              <SectorBadge
                name={row.sectors.name}
                color={row.sectors.color}
              />
            ) : null}
          </div>
          {row.patient_name ? (
            <p className="text-sm text-[var(--ink)]">
              Patient : <span className="font-medium">{row.patient_name}</span>
            </p>
          ) : null}
        </div>
        <StatusBadge status={row.status} />
      </header>
      <p className="mt-4 text-sm text-[var(--ink-muted)] leading-relaxed whitespace-pre-line">
        {row.message}
      </p>
      <RequestMediaGallery
        media={media.map((m) => ({
          id: m.id,
          filename: m.original_filename,
          mimeType: m.mime_type,
        }))}
      />
    </article>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const label = formatRequestCategory(category);
  const isUrgent = category === "Urgence";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] shrink-0 self-start",
        isUrgent
          ? "border-[var(--accent-warm)] text-[var(--accent-warm)]"
          : "border-[var(--line-strong)] text-[var(--ink)]",
      )}
    >
      {label}
    </span>
  );
}

function SectorBadge({
  name,
  color,
}: {
  name: string;
  color: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-2 border border-[var(--line-strong)] px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] shrink-0 self-start text-[var(--ink)]">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color ?? "var(--ink-discreet)" }}
      />
      {name}
    </span>
  );
}

function StatusBadge({ status }: { status: RequestRow["status"] }) {
  const isOpen = status === "open";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] shrink-0",
        isOpen
          ? "border-[var(--accent-warm)] text-[var(--accent-warm)]"
          : "border-[var(--line-strong)] text-[var(--ink-discreet)]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isOpen ? "bg-[var(--accent-warm)]" : "bg-[var(--ink-discreet)]",
        )}
      />
      {isOpen ? "En cours" : "Traitée"}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-[var(--line-strong)] px-5 py-8 text-center text-sm text-[var(--ink-muted)] bg-[var(--bg-elevated)]">
      {label}
    </div>
  );
}

function FeedbackBanner({ ok, error }: { ok?: string; error?: string }) {
  const key = ok ?? error;
  if (!key) return null;

  const message = FEEDBACK_MESSAGES[key] ?? (ok ? "Opération réussie." : "Une erreur est survenue.");
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
