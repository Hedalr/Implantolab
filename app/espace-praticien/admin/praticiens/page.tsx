import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
  withAdminTimeout,
} from "@/lib/supabase/admin";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import {
  createPractice,
  invitePractitioner,
  linkPractitioner,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string; detail?: string }>;

type PracticeRow = {
  id: string;
  name: string;
  city: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  practice_id: string | null;
  created_at: string;
  practices: { name: string | null; city: string | null } | null;
};

const FEEDBACK: Record<string, { title: string; message: string }> = {
  "practice-created": {
    title: "Cabinet créé",
    message: "Le cabinet a été ajouté. Vous pouvez maintenant inviter un praticien.",
  },
  invited: {
    title: "Invitation envoyée",
    message:
      "Le praticien recevra un e-mail pour définir son mot de passe et accéder à l’espace.",
  },
  "invited-prosthetist": {
    title: "Invitation envoyée",
    message:
      "Le prothésiste recevra un e-mail pour définir son mot de passe et accéder au module laboratoire.",
  },
  linked: {
    title: "Cabinet rattaché",
    message: "Le compte praticien est maintenant lié à son cabinet.",
  },
  "practice-name": {
    title: "Erreur",
    message: "Le nom du cabinet doit contenir au moins 2 caractères.",
  },
  "practice-save": {
    title: "Erreur",
    message: "Impossible d’enregistrer le cabinet. Merci de réessayer.",
  },
  "invite-validation": {
    title: "Erreur",
    message: "E-mail et cabinet sont obligatoires pour envoyer une invitation.",
  },
  "service-role": {
    title: "Configuration requise",
    message:
      "Ajoutez SUPABASE_SERVICE_ROLE_KEY dans les variables d’environnement pour envoyer des invitations.",
  },
  "invite-exists": {
    title: "Compte existant",
    message:
      "Cet e-mail est déjà enregistré. Utilisez le formulaire « Rattacher un compte » ci-dessous.",
  },
  "invite-failed": {
    title: "Erreur",
    message: "L’invitation n’a pas pu être envoyée. Vérifiez l’e-mail et réessayez.",
  },
  "invite-rate-limit": {
    title: "Quota d’e-mails atteint",
    message:
      "Le SMTP par défaut de Supabase est limité à 2 e-mails/heure (invitations + resets). Attendez 1 h ou configurez un SMTP custom (Resend, SendGrid) dans Project Settings → Authentication → SMTP Settings.",
  },
  "invite-smtp": {
    title: "Erreur SMTP",
    message:
      "Supabase n’a pas pu envoyer l’e-mail. Vérifiez la configuration SMTP dans le dashboard Supabase.",
  },
  "invite-profile": {
    title: "Erreur partielle",
    message:
      "L’invitation a été envoyée mais le rattachement au cabinet a échoué. Contactez le support technique.",
  },
  "link-validation": {
    title: "Erreur",
    message: "Sélectionnez un compte et un cabinet à rattacher.",
  },
  "link-failed": {
    title: "Erreur",
    message: "Impossible de rattacher le compte au cabinet.",
  },
};

const inputStyle = cn(
  "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
);

export default async function AdminPraticiensPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { ok, error, detail } = await searchParams;
  const feedbackKey = ok ?? error;
  const feedback = feedbackKey ? FEEDBACK[feedbackKey] : null;
  const canInvite = isServiceRoleConfigured();

  const supabase = await getServerSupabase();
  const { data: practicesData } = await supabase
    .from("practices")
    .select("id, name, city, created_at")
    .order("name", { ascending: true });

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name, practice_id, created_at, practices ( name, city )")
    .eq("role", "practitioner")
    .order("created_at", { ascending: false });

  const practices = (practicesData ?? []) as PracticeRow[];
  const profiles = (profilesData ?? []) as unknown as ProfileRow[];

  const emailById = new Map<string, string>();
  if (canInvite) {
    try {
      const admin = getServiceRoleSupabase();
      const { data: listData } = await withAdminTimeout(
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      );
      for (const user of listData.users ?? []) {
        if (user.email) {
          emailById.set(user.id, user.email);
        }
      }
    } catch (err) {
      // On log l'échec (visible dans les logs Vercel) mais on dégrade
      // gracieusement : la page s'affiche sans e-mails. Cela évite un
      // 504 Gateway Timeout si l'API Auth de Supabase ralentit.
      console.warn(
        "[admin/praticiens] listUsers indisponible, e-mails masqués :",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const unlinkedProfiles = profiles.filter((p) => !p.practice_id);

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Praticiens &amp; cabinets
        </h1>
        <p className="mt-2 text-[var(--ink-muted)] leading-relaxed">
          Créez les cabinets partenaires et invitez les praticiens par e-mail.
        </p>
      </header>

      {feedback ? (
        <div
          role="status"
          className={cn(
            "mb-8 border-l-4 pl-4 py-3 bg-[var(--bg-elevated)] max-w-3xl",
            error ? "border-[var(--ink)]" : "border-[var(--accent-warm)]",
          )}
        >
          <p className="text-sm font-medium text-[var(--ink)]">{feedback.title}</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{feedback.message}</p>
          {error && detail ? (
            <p className="mt-2 text-xs font-mono text-[var(--ink-discreet)] break-all">
              Détail technique : {detail}
            </p>
          ) : null}
        </div>
      ) : null}

      {!canInvite ? (
        <div className="mb-8 border border-[var(--line-strong)] bg-[var(--bg-elevated)] p-5 max-w-3xl">
          <p className="text-eyebrow text-[var(--accent-warm)]">Configuration</p>
          <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
            Pour envoyer des invitations par e-mail, ajoutez{" "}
            <code className="text-[var(--ink)]">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            dans <code className="text-[var(--ink)]">.env.local</code> (local) ou
            Vercel (production). Récupérez-la dans Supabase → Project Settings →
            API → service_role.
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 flex flex-col gap-8">
          <Panel title="Nouveau cabinet" eyebrow="Étape 1">
            <form action={createPractice} className="mt-5 flex flex-col gap-5">
              <Field label="Nom du cabinet" htmlFor="practice-name" required>
                <input
                  id="practice-name"
                  name="name"
                  required
                  placeholder="Cabinet Dr. Martin"
                  className={inputStyle}
                />
              </Field>
              <Field label="Ville" htmlFor="practice-city">
                <input
                  id="practice-city"
                  name="city"
                  placeholder="Blois"
                  className={inputStyle}
                />
              </Field>
              <Button type="submit" variant="primary">
                Créer le cabinet
              </Button>
            </form>
          </Panel>

          <Panel title="Inviter un utilisateur" eyebrow="Étape 2">
            <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
              L’utilisateur reçoit un e-mail pour choisir son mot de passe.
              Choisissez le type de compte : praticien (dentiste, rattaché à
              un cabinet) ou prothésiste du laboratoire.
            </p>
            <form
              action={invitePractitioner}
              className="mt-5 flex flex-col gap-5"
            >
              <fieldset className="flex flex-col gap-2">
                <legend className="text-eyebrow mb-1">Type de compte *</legend>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="practitioner"
                    defaultChecked
                    disabled={!canInvite}
                    className="mt-1 accent-[var(--accent-warm)]"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm text-[var(--ink)]">
                      Praticien (dentiste)
                    </span>
                    <span className="text-xs text-[var(--ink-discreet)]">
                      Accès à ses fermetures et demandes, rattaché à un cabinet.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="prosthetist"
                    disabled={!canInvite}
                    className="mt-1 accent-[var(--accent-warm)]"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm text-[var(--ink)]">
                      Prothésiste (collaborateur labo)
                    </span>
                    <span className="text-xs text-[var(--ink-discreet)]">
                      Accès aux dossiers patient reçus par WhatsApp. Aucun
                      cabinet à sélectionner.
                    </span>
                  </span>
                </label>
              </fieldset>

              <Field label="E-mail" htmlFor="invite-email" required>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  disabled={!canInvite}
                  placeholder="dr.martin@cabinet.fr"
                  className={inputStyle}
                />
              </Field>
              <Field label="Nom complet" htmlFor="invite-name">
                <input
                  id="invite-name"
                  name="full_name"
                  disabled={!canInvite}
                  placeholder="Dr. Jean Martin"
                  className={inputStyle}
                />
              </Field>
              <Field
                label="Cabinet (praticiens uniquement)"
                htmlFor="invite-practice"
              >
                <select
                  id="invite-practice"
                  name="practice_id"
                  disabled={!canInvite || practices.length === 0}
                  className={cn(inputStyle, "cursor-pointer")}
                  defaultValue=""
                >
                  <option value="">
                    {practices.length === 0
                      ? "Créez d’abord un cabinet"
                      : "Sélectionner un cabinet"}
                  </option>
                  {practices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.city ? ` — ${p.city}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" variant="primary" disabled={!canInvite}>
                Envoyer l’invitation
              </Button>
            </form>
          </Panel>

          {unlinkedProfiles.length > 0 ? (
            <Panel title="Rattacher un compte existant" eyebrow="Comptes en attente">
              <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
                Pour les comptes déjà créés sans cabinet (accès partiel).
              </p>
              <form action={linkPractitioner} className="mt-5 flex flex-col gap-5">
                <Field label="Compte" htmlFor="link-profile" required>
                  <select
                    id="link-profile"
                    name="profile_id"
                    required
                    className={cn(inputStyle, "cursor-pointer")}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner un compte
                    </option>
                    {unlinkedProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name ?? emailById.get(p.id) ?? p.id.slice(0, 8)}
                        {emailById.get(p.id) && p.full_name
                          ? ` (${emailById.get(p.id)})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cabinet" htmlFor="link-practice" required>
                  <select
                    id="link-practice"
                    name="practice_id"
                    required
                    className={cn(inputStyle, "cursor-pointer")}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner un cabinet
                    </option>
                    {practices.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.city ? ` — ${p.city}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nom complet (facultatif)" htmlFor="link-name">
                  <input
                    id="link-name"
                    name="full_name"
                    placeholder="Dr. Jean Martin"
                    className={inputStyle}
                  />
                </Field>
                <Button type="submit" variant="secondary">
                  Rattacher au cabinet
                </Button>
              </form>
            </Panel>
          ) : null}
        </div>

        <div className="lg:col-span-7 flex flex-col gap-8">
          <Panel title={`Cabinets (${practices.length})`} eyebrow="Répertoire">
            {practices.length === 0 ? (
              <Empty label="Aucun cabinet enregistré." />
            ) : (
              <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {practices.map((p) => {
                  const linkedCount = profiles.filter(
                    (pr) => pr.practice_id === p.id,
                  ).length;
                  return (
                    <li
                      key={p.id}
                      className="flex items-baseline justify-between gap-4 py-4"
                    >
                      <div>
                        <p className="text-[var(--ink)] font-medium">{p.name}</p>
                        {p.city ? (
                          <p className="text-xs text-[var(--ink-discreet)] mt-0.5">
                            {p.city}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs text-[var(--ink-discreet)] whitespace-nowrap">
                        {linkedCount} praticien{linkedCount !== 1 ? "s" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title={`Praticiens (${profiles.length})`} eyebrow="Comptes">
            {profiles.length === 0 ? (
              <Empty label="Aucun praticien invité pour le moment." />
            ) : (
              <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {profiles.map((p) => (
                  <li key={p.id} className="py-4 flex flex-col gap-1.5 sm:flex-row sm:justify-between sm:gap-6">
                    <div>
                      <p className="text-[var(--ink)]">
                        {p.full_name ?? "Sans nom"}
                      </p>
                      <p className="text-xs text-[var(--ink-discreet)]">
                        {emailById.get(p.id) ?? "E-mail non disponible"}
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      {p.practices?.name ? (
                        <span className="text-sm text-[var(--ink-muted)]">
                          {p.practices.name}
                          {p.practices.city ? ` · ${p.practices.city}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs tracking-wide uppercase text-[var(--accent-warm)]">
                          Accès partiel
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </Container>
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

function Empty({ label }: { label: string }) {
  return (
    <p className="mt-5 py-6 text-sm text-[var(--ink-discreet)] text-center border border-dashed border-[var(--line-strong)]">
      {label}
    </p>
  );
}
