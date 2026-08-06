import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ConfirmFormButton } from "@/components/espace-praticien/ConfirmFormButton";
import { cn } from "@/lib/cn";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { createAnnouncement, deleteAnnouncement } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string }>;

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  expires_at: string;
};

const FEEDBACK: Record<string, { title: string; message: string }> = {
  created: {
    title: "Annonce envoyée",
    message:
      "Le message a été enregistré. Une notification push part vers les praticiens équipés de l’app.",
  },
  deleted: {
    title: "Annonce retirée",
    message: "L’annonce n’est plus visible pour les praticiens.",
  },
  "title-validation": {
    title: "Erreur",
    message: "Le titre doit contenir entre 1 et 120 caractères.",
  },
  "body-validation": {
    title: "Erreur",
    message: "Le message doit contenir entre 1 et 2000 caractères.",
  },
  "expires-validation": {
    title: "Erreur",
    message: "La date de fin de visibilité doit être dans le futur.",
  },
  "save-failed": {
    title: "Erreur",
    message: "Impossible d’enregistrer l’annonce. Réessayez.",
  },
  "delete-validation": {
    title: "Erreur",
    message: "Annonce invalide.",
  },
  "delete-failed": {
    title: "Erreur",
    message: "Impossible de supprimer l’annonce.",
  },
};

const inputStyle = cn(
  "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
);

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function defaultExpiresLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setMinutes(0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:00`;
}

export default async function AdminAnnoncesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const feedbackKey = ok ?? error;
  const feedback = feedbackKey ? FEEDBACK[feedbackKey] : null;

  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("admin_announcements")
    .select("id, title, body, created_at, expires_at")
    .order("created_at", { ascending: false });

  const now = Date.now();
  const rows = (data ?? []) as AnnouncementRow[];
  const active: AnnouncementRow[] = [];
  const expired: AnnouncementRow[] = [];
  for (const row of rows) {
    if (new Date(row.expires_at).getTime() > now) active.push(row);
    else expired.push(row);
  }

  return (
    <Container className="py-10 md:py-14">
      <header className="max-w-3xl">
        <p className="text-eyebrow">Espace admin</p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl text-[var(--ink)]">
          Annonces
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed">
          Diffusez un message à tous les dentistes : ils reçoivent une
          notification sur l’app, et peuvent le relire jusqu’à la date de fin
          de visibilité.
        </p>
      </header>

      {feedback ? (
        <div
          role="status"
          className={cn(
            "mt-8 border-l-4 pl-4 py-3 bg-[var(--bg-elevated)] max-w-3xl",
            error ? "border-[var(--ink)]" : "border-[var(--accent-warm)]",
          )}
        >
          <p className="text-sm font-medium text-[var(--ink)]">
            {feedback.title}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {feedback.message}
          </p>
        </div>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel eyebrow="Nouveau message" title="Écrire une annonce">
            <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
              Après envoi, une notification push part immédiatement vers tous
              les praticiens qui ont l’app installée.
            </p>
            <form
              action={createAnnouncement}
              className="mt-5 flex flex-col gap-5"
            >
              <Field label="Titre" htmlFor="announcement-title" required>
                <input
                  id="announcement-title"
                  name="title"
                  required
                  maxLength={120}
                  placeholder="Fermeture du laboratoire"
                  className={inputStyle}
                />
              </Field>
              <Field label="Message" htmlFor="announcement-body" required>
                <textarea
                  id="announcement-body"
                  name="body"
                  required
                  maxLength={2000}
                  rows={5}
                  placeholder="Le laboratoire sera fermé du 10 au 30 août…"
                  className={cn(inputStyle, "resize-y min-h-28")}
                />
              </Field>
              <Field
                label="Visible jusqu’au"
                htmlFor="announcement-expires"
                required
              >
                <input
                  id="announcement-expires"
                  name="expires_at"
                  type="datetime-local"
                  required
                  defaultValue={defaultExpiresLocal()}
                  className={inputStyle}
                />
              </Field>
              <Button type="submit" variant="primary">
                Envoyer aux dentistes
              </Button>
            </form>
          </Panel>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-8">
          <Panel
            eyebrow="En cours"
            title={`Annonces actives (${active.length})`}
          >
            {active.length === 0 ? (
              <p className="mt-5 py-6 text-sm text-[var(--ink-discreet)] text-center border border-dashed border-[var(--line-strong)]">
                Aucune annonce visible pour le moment.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {active.map((row) => (
                  <AnnouncementItem key={row.id} row={row} canDelete />
                ))}
              </ul>
            )}
          </Panel>

          {expired.length > 0 ? (
            <Panel
              eyebrow="Historique"
              title={`Expirées (${expired.length})`}
            >
              <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {expired.map((row) => (
                  <AnnouncementItem key={row.id} row={row} />
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </Container>
  );
}

function AnnouncementItem({
  row,
  canDelete = false,
}: {
  row: AnnouncementRow;
  canDelete?: boolean;
}) {
  return (
    <li className="py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--ink)]">{row.title}</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)] whitespace-pre-wrap">
          {row.body}
        </p>
        <p className="mt-2 text-xs text-[var(--ink-discreet)]">
          Publiée le {dateTimeFormatter.format(new Date(row.created_at))} ·
          Visible jusqu’au{" "}
          {dateTimeFormatter.format(new Date(row.expires_at))}
        </p>
      </div>
      {canDelete ? (
        <ConfirmFormButton
          action={deleteAnnouncement}
          hiddenFields={{ id: row.id }}
          confirmTitle="Retirer cette annonce ?"
          confirmMessage="Elle ne sera plus visible pour les dentistes."
          className="shrink-0 text-sm text-[var(--ink-muted)] underline underline-offset-4 hover:text-[var(--ink)]"
        >
          Retirer
        </ConfirmFormButton>
      ) : null}
    </li>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8">
      <p className="text-eyebrow">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-xl text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
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
    </div>
  );
}
