import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/espace-praticien/FormField";
import { cn } from "@/lib/cn";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import {
  countInclusiveDays,
  formatDateRange,
  parseDateOnly,
} from "@/lib/utils/date";
import { addClosurePeriod, deleteClosurePeriod } from "./actions";

export const metadata: Metadata = {
  title: "Mes fermetures — Espace praticien",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ ok?: string; error?: string }>;

type ClosurePeriodRow = {
  id: string;
  start_date: string;
  end_date: string;
  note: string | null;
};

const FEEDBACK_MESSAGES: Record<string, string> = {
  added: "Fermeture enregistrée.",
  deleted: "Fermeture supprimée.",
  validation: "Les dates saisies sont incomplètes ou invalides.",
  order: "La date de fin doit être postérieure ou égale à la date de début.",
  note: "La note doit contenir au plus 500 caractères.",
  save: "Une erreur est survenue lors de l’enregistrement. Merci de réessayer.",
  delete: "Impossible de supprimer cette fermeture. Merci de réessayer.",
  "no-practice":
    "Votre cabinet n’est pas encore rattaché à votre compte.",
};

export default async function FermeturesPage({
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
          title={`Mes fermetures — ${practiceLabel}`}
          intro="Déclarez vos dates de fermeture pour que le laboratoire puisse ajuster le planning de production."
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
  const { data } = await supabase
    .from("closure_periods")
    .select("id, start_date, end_date, note")
    .eq("practice_id", profile.practiceId)
    .order("start_date", { ascending: true });

  const rows = (data ?? []) as ClosurePeriodRow[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const upcoming = rows.filter(
    (r) => parseDateOnly(r.end_date).getTime() >= todayTime,
  );
  const past = rows
    .filter((r) => parseDateOnly(r.end_date).getTime() < todayTime)
    .reverse();

  return (
    <Container size="wide" className="py-12 md:py-16">
      <PageHeader
        title={`Mes fermetures — ${practiceLabel}`}
        intro="Déclarez vos dates de fermeture pour que le laboratoire puisse ajuster le planning de production."
      />

      <FeedbackBanner ok={ok} error={error} />

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-5">
          <Card>
            <CardHeader
              eyebrow="Formulaire"
              title="Nouvelle fermeture"
              description="Ajoutez une plage de dates. Les demandes en cours seront réajustées en conséquence."
            />
            <form action={addClosurePeriod} className="mt-6 flex flex-col gap-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="Date de début" htmlFor="start_date" required>
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    required
                    className={inputStyle}
                  />
                </FormField>
                <FormField label="Date de fin" htmlFor="end_date" required>
                  <input
                    id="end_date"
                    name="end_date"
                    type="date"
                    required
                    className={inputStyle}
                  />
                </FormField>
              </div>

              <FormField
                label="Note interne"
                htmlFor="note"
                hint="Facultatif — motif, congés, formation, etc. (500 caractères max.)"
              >
                <textarea
                  id="note"
                  name="note"
                  rows={3}
                  maxLength={500}
                  placeholder="Ex. Congés d’été — cabinet fermé."
                  className={cn(inputStyle, "resize-none p-3 border")}
                />
              </FormField>

              <div className="pt-2">
                <Button variant="primary" type="submit">
                  Enregistrer
                </Button>
              </div>
            </form>
          </Card>
        </section>

        <div className="lg:col-span-7 flex flex-col gap-8">
          <Card>
            <CardHeader
              eyebrow="À venir"
              title="Prochaines fermetures"
              description={
                upcoming.length === 0
                  ? "Aucune fermeture à venir n’est déclarée."
                  : `${upcoming.length} plage${upcoming.length > 1 ? "s" : ""} programmée${upcoming.length > 1 ? "s" : ""}.`
              }
            />

            {upcoming.length === 0 ? (
              <EmptyState label="Aucune fermeture déclarée pour l’instant." />
            ) : (
              <ul className="mt-6 flex flex-col divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {upcoming.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div className="flex flex-col gap-1.5">
                      <p className="font-serif text-lg text-[var(--ink)]">
                        {formatDateRange(row.start_date, row.end_date)}
                      </p>
                      <p className="text-xs text-[var(--ink-discreet)] tracking-wide uppercase">
                        {countInclusiveDays(row.start_date, row.end_date)} jour
                        {countInclusiveDays(row.start_date, row.end_date) > 1
                          ? "s"
                          : ""}
                      </p>
                      {row.note ? (
                        <p className="mt-1 text-sm text-[var(--ink-muted)] leading-relaxed">
                          {row.note}
                        </p>
                      ) : null}
                    </div>
                    <form
                      action={deleteClosurePeriod}
                      className="shrink-0 self-start"
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--accent-warm)] transition-colors"
                      >
                        Supprimer
                      </button>
                    </form>
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
                      Fermetures passées ({past.length})
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
                        {formatDateRange(row.start_date, row.end_date)}
                      </span>
                      {row.note ? (
                        <span className="text-[var(--ink-discreet)] sm:text-right sm:max-w-[60%]">
                          {row.note}
                        </span>
                      ) : null}
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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="mt-6 border border-dashed border-[var(--line-strong)] px-5 py-8 text-center text-sm text-[var(--ink-muted)]">
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
