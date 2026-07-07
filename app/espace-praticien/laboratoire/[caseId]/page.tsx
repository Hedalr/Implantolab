import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getServerSupabase, requireLaboStaff } from "@/lib/supabase/server";
import {
  getCaseById,
  getDentistContact,
  listMediaForCase,
  listMessagesForCase,
  listProsthetists,
} from "@/lib/labo/queries";
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  type CaseMedia,
  type CasePriority,
  type CaseStatus,
} from "@/lib/labo/types";
import { formatPhoneForDisplay } from "@/lib/labo/phone";
import { addInternalNote, updateCase } from "../actions";

export const metadata: Metadata = {
  title: "Dossier patient — Laboratoire",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ ok?: string; error?: string }>;

const FEEDBACK_MESSAGES: Record<string, string> = {
  updated: "Dossier mis à jour.",
  "note-added": "Commentaire interne enregistré.",
  merged: "Les deux dossiers ont été fusionnés.",
};

const STATUS_OPTIONS: CaseStatus[] = [
  "pending_review",
  "received",
  "in_progress",
  "waiting_info",
  "completed",
  "delivered",
  "archived",
];
const PRIORITY_OPTIONS: CasePriority[] = ["low", "normal", "high", "urgent"];

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return dateTimeFormatter.format(new Date(iso));
}

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: SearchParams;
}) {
  const { profile } = await requireLaboStaff();
  const { caseId } = await params;
  const { ok, error } = await searchParams;

  const supabase = await getServerSupabase();
  const caseRow = await getCaseById(supabase, caseId);
  if (!caseRow) notFound();

  const [messages, media, prosthetists, dentistContact] = await Promise.all([
    listMessagesForCase(supabase, caseId),
    listMediaForCase(supabase, caseId),
    listProsthetists(supabase),
    caseRow.dentistContactId
      ? getDentistContact(supabase, caseRow.dentistContactId)
      : Promise.resolve(null),
  ]);

  const feedbackKey = ok ?? error;
  const feedbackMessage = feedbackKey
    ? FEEDBACK_MESSAGES[feedbackKey] ??
      (ok ? "Opération réussie." : "Une erreur est survenue.")
    : null;
  const feedbackIsError = Boolean(error);

  return (
    <div className="flex flex-col gap-8">
      <nav className="text-xs text-[var(--ink-discreet)]">
        <Link
          href="/espace-praticien/laboratoire"
          className="hover:text-[var(--ink)] transition-colors"
        >
          ← Retour aux dossiers
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-eyebrow tabular-nums">{caseRow.caseNumber}</span>
          <span
            className={cn(
              "inline-flex items-center border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em]",
              caseRow.priority === "urgent"
                ? "border-[var(--accent-warm)] text-[var(--accent-warm)]"
                : "border-[var(--line-strong)] text-[var(--ink-muted)]",
            )}
          >
            Priorité {CASE_PRIORITY_LABELS[caseRow.priority]}
          </span>
          <span className="inline-flex items-center border border-[var(--line-strong)] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
            {CASE_STATUS_LABELS[caseRow.status]}
          </span>
          {caseRow.needsReview ? (
            <span className="inline-flex items-center gap-1 border border-[var(--accent-warm)] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-[var(--accent-warm)]">
              À valider
            </span>
          ) : null}
        </div>
        <h1 className="font-serif text-2xl md:text-3xl text-[var(--ink)] leading-tight">
          {caseRow.patientName ?? "Patient non identifié"}
        </h1>
        <div className="flex items-center gap-3 flex-wrap text-sm text-[var(--ink-muted)]">
          <span>
            Dentiste :{" "}
            <strong className="text-[var(--ink)]">
              {caseRow.dentistNameRaw ??
                dentistContact?.fullName ??
                "Non identifié"}
            </strong>
          </span>
          {caseRow.dentistPhoneE164 ? (
            <span aria-hidden>·</span>
          ) : null}
          {caseRow.dentistPhoneE164 ? (
            <a
              href={`https://wa.me/${caseRow.dentistPhoneE164.replace(/^\+/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 decoration-[var(--line-strong)] hover:decoration-[var(--ink)]"
            >
              {formatPhoneForDisplay(caseRow.dentistPhoneE164)}
            </a>
          ) : null}
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            Reçu {formatDateTime(caseRow.lastMessageAt ?? caseRow.createdAt)}
          </span>
        </div>
      </header>

      {feedbackMessage ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "border-l pl-4 py-2 bg-[var(--bg-elevated)] text-sm text-[var(--ink)]",
            feedbackIsError ? "border-[var(--ink)]" : "border-[var(--accent-warm)]",
          )}
        >
          <span
            className={cn(
              "text-eyebrow mr-3",
              feedbackIsError ? "text-[var(--ink-muted)]" : "text-[var(--accent-warm)]",
            )}
          >
            {feedbackIsError ? "Erreur" : "Confirmation"}
          </span>
          {feedbackMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 flex flex-col gap-8">
          <Card>
            <CardHeader
              eyebrow="Pièces jointes"
              title={`${media.length} fichier${media.length > 1 ? "s" : ""}`}
              description={
                media.length === 0
                  ? "Aucune photo ni document reçu pour ce dossier."
                  : "Cliquez sur une vignette pour agrandir (URL signée, 5 min)."
              }
            />
            {media.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {media.map((m) => (
                  <MediaThumb key={m.id} media={m} />
                ))}
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              eyebrow="Historique WhatsApp"
              title="Messages"
              description="Fil des messages reçus du dentiste et notes internes."
            />
            {messages.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--ink-discreet)]">
                Aucun message enregistré.
              </p>
            ) : (
              <ol className="mt-5 flex flex-col gap-4">
                {messages.map((msg) => (
                  <li
                    key={msg.id}
                    className={cn(
                      "border-l pl-4 py-2",
                      msg.direction === "inbound"
                        ? "border-[var(--accent-warm)]"
                        : "border-[var(--line-strong)]",
                    )}
                  >
                    <div className="flex items-center gap-3 text-xs text-[var(--ink-discreet)]">
                      <span className="text-eyebrow">
                        {msg.direction === "inbound"
                          ? "Dentiste"
                          : "Note interne"}
                      </span>
                      <span className="tabular-nums">
                        {formatDateTime(msg.receivedAt ?? msg.createdAt)}
                      </span>
                    </div>
                    {msg.body ? (
                      <p className="mt-1 text-sm text-[var(--ink)] whitespace-pre-line leading-relaxed">
                        {msg.body}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--ink-discreet)] italic">
                        (pièce jointe sans texte)
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}

            <form action={addInternalNote} className="mt-6 flex flex-col gap-3">
              <input type="hidden" name="caseId" value={caseRow.id} />
              <label className="text-eyebrow" htmlFor="internal-note">
                Ajouter une note interne
              </label>
              <textarea
                id="internal-note"
                name="body"
                required
                minLength={3}
                maxLength={2000}
                rows={3}
                placeholder="Note visible uniquement par le labo (n’est pas envoyée au dentiste)."
                className="w-full bg-transparent border border-[var(--line-strong)] p-3 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)]"
              />
              <div>
                <Button variant="secondary" type="submit">
                  Enregistrer la note
                </Button>
              </div>
            </form>
          </Card>
        </section>

        <aside className="flex flex-col gap-8">
          <Card>
            <CardHeader
              eyebrow="Fiche patient"
              title="Correction & validation"
              description={
                caseRow.needsReview
                  ? "Vérifiez les champs extraits par l’IA avant que ce dossier ne soit visible en production."
                  : "Modifier les informations du dossier."
              }
            />
            <form action={updateCase} className="mt-5 flex flex-col gap-4">
              <input type="hidden" name="caseId" value={caseRow.id} />

              <Field label="Nom du patient" htmlFor="patientName">
                <input
                  id="patientName"
                  name="patientName"
                  type="text"
                  defaultValue={caseRow.patientName ?? ""}
                  placeholder="Prénom Nom"
                  className={inputStyle}
                />
              </Field>

              <Field label="Dentiste" htmlFor="dentistName">
                <input
                  id="dentistName"
                  name="dentistName"
                  type="text"
                  defaultValue={caseRow.dentistNameRaw ?? ""}
                  placeholder="Dr Martin — Cabinet Lyon 6"
                  className={inputStyle}
                />
              </Field>

              <Field label="Type de travail" htmlFor="workType">
                <input
                  id="workType"
                  name="workType"
                  type="text"
                  defaultValue={caseRow.workType ?? ""}
                  placeholder="Couronne, bridge, implant…"
                  className={inputStyle}
                />
              </Field>

              <Field label="Description" htmlFor="description">
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={caseRow.description ?? ""}
                  className={cn(
                    inputStyle,
                    "border p-3 resize-y",
                  )}
                />
              </Field>

              <Field label="Statut" htmlFor="status">
                <select
                  id="status"
                  name="status"
                  defaultValue={caseRow.status}
                  className={inputStyle}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {CASE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Priorité" htmlFor="priority">
                <select
                  id="priority"
                  name="priority"
                  defaultValue={caseRow.priority}
                  className={inputStyle}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {CASE_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Prothésiste assigné" htmlFor="assignedTo">
                <select
                  id="assignedTo"
                  name="assignedTo"
                  defaultValue={caseRow.assignedProsthetistId ?? ""}
                  className={inputStyle}
                >
                  <option value="">— Non assigné —</option>
                  {prosthetists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="pt-2">
                <Button variant="primary" type="submit">
                  Enregistrer
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader eyebrow="Contact dentiste" title="Répertoire" />
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <MetaRow label="Numéro WhatsApp">
                {formatPhoneForDisplay(caseRow.dentistPhoneE164) || "—"}
              </MetaRow>
              <MetaRow label="Nom">
                {dentistContact?.fullName ??
                  caseRow.dentistNameRaw ??
                  "—"}
              </MetaRow>
              {dentistContact?.email ? (
                <MetaRow label="Email">{dentistContact.email}</MetaRow>
              ) : null}
              <MetaRow label="Créé">
                {formatDateTime(caseRow.createdAt)}
              </MetaRow>
              <MetaRow label="Session">
                <span className="text-[var(--ink-discreet)] text-xs">
                  {profile.email}
                </span>
              </MetaRow>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

const inputStyle =
  "w-full bg-transparent border-b border-[var(--line-strong)] py-2 text-base text-[var(--ink)] placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-7">
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
      <h2 className="font-serif text-lg text-[var(--ink)]">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-[var(--ink-discreet)] leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-eyebrow">
        {label}
      </label>
      {children}
    </div>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 justify-between">
      <dt className="text-eyebrow text-[var(--ink-discreet)] shrink-0">
        {label}
      </dt>
      <dd className="text-[var(--ink)] text-right">{children}</dd>
    </div>
  );
}

function MediaThumb({ media }: { media: CaseMedia }) {
  const isImage = media.mimeType?.startsWith("image/");
  const href = `/api/case-media/${media.id}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-square overflow-hidden border border-[var(--line)] bg-[var(--bg)]"
    >
      {isImage ? (
        <img
          src={href}
          alt={media.caption ?? media.originalFilename ?? "pièce jointe"}
          className="h-full w-full object-cover group-hover:opacity-90 transition-opacity"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center flex-col gap-1 text-xs text-[var(--ink-discreet)]">
          <span aria-hidden className="text-2xl">📄</span>
          <span className="truncate max-w-[80%]">
            {media.mimeType ?? "fichier"}
          </span>
        </div>
      )}
      {media.caption ? (
        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">
          {media.caption}
        </div>
      ) : null}
    </a>
  );
}
