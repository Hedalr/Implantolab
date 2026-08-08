import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import { isPostgresBackend } from "@/lib/db/backend";
import { listPractitionersPg } from "@/lib/rh/pg";
import { isServiceRoleConfigured, loadAuthEmailById } from "@/lib/supabase/admin";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { InviteUserForm } from "@/components/espace-praticien/InviteUserForm";
import { ConfirmFormButton } from "@/components/espace-praticien/ConfirmFormButton";
import { roleLabel, type ProfileRole } from "@/lib/roles";
import {
  deletePractitioner,
  permanentlyDeletePractitioner,
  reactivatePractitioner,
  resendInvite,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string; detail?: string }>;

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  created_at: string;
  deleted_at: string | null;
  invite_pending?: boolean;
};

const FEEDBACK: Record<string, { title: string; message: string }> = {
  invited: {
    title: "Invitation envoyée",
    message:
      "Le praticien recevra un e-mail pour définir son mot de passe et accéder à l’espace.",
  },
  "invite-resent": {
    title: "Invitation renvoyée",
    message:
      "Un nouvel e-mail d’invitation a été envoyé. L’ancien lien n’est plus valide.",
  },
  "invite-resend-partial": {
    title: "Invitation régénérée",
    message:
      "Le lien a été régénéré mais l’e-mail n’a pas pu être envoyé (SMTP). Réessayez « Renvoyer l’invitation ».",
  },
  "invite-not-pending": {
    title: "Compte déjà activé",
    message:
      "Ce compte a déjà défini son mot de passe. Impossible de renvoyer une invitation.",
  },
  "invite-validation": {
    title: "Erreur",
    message: "L’e-mail est obligatoire pour inviter un utilisateur.",
  },
  "service-role": {
    title: "Configuration requise",
    message:
      "Ajoutez SUPABASE_SERVICE_ROLE_KEY dans les variables d’environnement pour envoyer des invitations.",
  },
  "invite-exists": {
    title: "Compte existant",
    message:
      "Cet e-mail est déjà enregistré. Aucun nouvel e-mail d’invitation n’a été renvoyé.",
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
      "L’invitation a été envoyée mais la mise à jour du profil a échoué. Contactez le support technique.",
  },
  "invite-exists-deleted": {
    title: "Compte désactivé",
    message:
      "Cette adresse appartient à un compte désactivé. Utilisez le bouton « Réactiver » dans la liste des comptes désactivés ci-dessous plutôt que d’inviter à nouveau.",
  },
  deleted: {
    title: "Accès révoqué",
    message:
      "Le praticien n’a plus accès à son espace. Son historique est conservé et son adresse e-mail pourra être réutilisée en le réactivant.",
  },
  reactivated: {
    title: "Compte réactivé",
    message:
      "L’accès a été rétabli. Un e-mail lui a été envoyé pour définir un nouveau mot de passe.",
  },
  "reactivate-partial": {
    title: "Compte réactivé",
    message:
      "L’accès a été rétabli mais l’e-mail de reconnexion n’a pas pu être envoyé. Réessayez la réactivation ou contactez la personne directement.",
  },
  "reactivate-failed": {
    title: "Erreur",
    message: "Impossible de réactiver ce compte. Réessayez ou contactez le support technique.",
  },
  "delete-validation": {
    title: "Erreur",
    message: "Impossible d’identifier ce compte.",
  },
  "delete-failed": {
    title: "Erreur",
    message:
      "La révocation de l’accès a échoué. Réessayez ou contactez le support technique.",
  },
  "deleted-permanently": {
    title: "Compte supprimé",
    message:
      "Le compte et son historique (demandes, congés, fermetures) ont été supprimés définitivement. L’adresse e-mail est immédiatement réutilisable pour une nouvelle invitation.",
  },
};

export default async function AdminPraticiensPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { ok, error, detail } = await searchParams;
  const feedbackKey = ok ?? error;
  const feedback = feedbackKey ? FEEDBACK[feedbackKey] : null;
  const canInvite = isPostgresBackend() || isServiceRoleConfigured();

  let profiles: ProfileRow[] = [];
  let emailById = new Map<string, string>();

  if (isPostgresBackend()) {
    const rows = await listPractitionersPg();
    profiles = rows.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      created_at: p.created_at,
      deleted_at: p.deleted_at,
      invite_pending: p.invite_pending,
    }));
    emailById = new Map(rows.map((p) => [p.id, p.email]));
  } else {
    const supabase = await getServerSupabase();
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at, deleted_at")
      .eq("role", "practitioner")
      .order("created_at", { ascending: false });

    profiles = (profilesData ?? []) as ProfileRow[];
    emailById = canInvite
      ? await loadAuthEmailById("admin/praticiens")
      : new Map<string, string>();
  }

  const activeProfiles = profiles.filter((p) => !p.deleted_at);
  const deactivatedProfiles = profiles.filter((p) => p.deleted_at);

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Praticiens
        </h1>
        <p className="mt-2 text-[var(--ink-muted)] leading-relaxed">
          Invitez les dentistes par e-mail. Les collaborateurs labo
          (prothésistes, chefs de secteur) se gèrent dans{" "}
          <a
            href="/espace-praticien/admin/employes"
            className="underline underline-offset-4 hover:text-[var(--ink)]"
          >
            Équipe
          </a>
          .
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
            Mode Supabase : ajoutez{" "}
            <code className="text-[var(--ink)]">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            dans <code className="text-[var(--ink)]">.env.local</code> ou Vercel
            pour envoyer des invitations. En mode postgres local, les invitations
            utilisent <code className="text-[var(--ink)]">public.users</code>{" "}
            (Resend optionnel).
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel title="Inviter un praticien" eyebrow="Invitation">
            <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
              Le dentiste reçoit un e-mail pour choisir son mot de passe et
              accéder à ses fermetures et demandes.
            </p>
            <InviteUserForm sectors={[]} canInvite={canInvite} mode="practitioner" />
          </Panel>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-8">
          <Panel
            title={`Praticiens actifs (${activeProfiles.length})`}
            eyebrow="Comptes"
          >
            {activeProfiles.length === 0 ? (
              <Empty label="Aucun praticien actif pour le moment." />
            ) : (
              <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {activeProfiles.map((p) => (
                  <li
                    key={p.id}
                    className="py-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div>
                      <p className="text-[var(--ink)]">
                        {p.full_name ?? "Sans nom"}
                      </p>
                      <p className="text-xs text-[var(--ink-discreet)]">
                        {emailById.get(p.id) ?? "E-mail non disponible"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs tracking-wide uppercase text-[var(--ink-discreet)]">
                        {roleLabel(p.role)}
                      </span>
                      {p.invite_pending ? (
                        <form action={resendInvite}>
                          <input type="hidden" name="profile_id" value={p.id} />
                          <button
                            type="submit"
                            className="text-xs tracking-wide uppercase text-[var(--ink)] hover:text-[var(--accent-warm)] transition-colors whitespace-nowrap"
                          >
                            Renvoyer l’invitation
                          </button>
                        </form>
                      ) : null}
                      <ConfirmFormButton
                        action={deletePractitioner}
                        hiddenFields={{ profile_id: p.id }}
                        confirmTitle={`Supprimer l’accès de ${p.full_name ?? "ce praticien"} ?`}
                        confirmMessage="Son historique est conservé et vous pourrez le réactiver plus tard."
                        className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--accent-warm)] transition-colors whitespace-nowrap"
                      >
                        Supprimer l’accès
                      </ConfirmFormButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {deactivatedProfiles.length > 0 ? (
            <Panel
              title={`Comptes désactivés (${deactivatedProfiles.length})`}
              eyebrow="Historique"
            >
              <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
                Ces comptes n’ont plus accès. Réactivez un compte pour lui
                redonner accès, ou supprimez-le définitivement.
              </p>
              <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {deactivatedProfiles.map((p) => (
                  <li
                    key={p.id}
                    className="py-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div>
                      <p className="text-[var(--ink-muted)]">
                        {p.full_name ?? "Sans nom"}
                      </p>
                      <p className="text-xs text-[var(--ink-discreet)]">
                        {emailById.get(p.id) ?? "E-mail non disponible"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs tracking-wide uppercase text-[var(--ink-discreet)]">
                        {roleLabel(p.role)}
                      </span>
                      <form action={reactivatePractitioner}>
                        <input type="hidden" name="profile_id" value={p.id} />
                        <button
                          type="submit"
                          className="text-xs tracking-wide uppercase text-[var(--ink)] hover:text-[var(--accent-warm)] transition-colors whitespace-nowrap"
                        >
                          Réactiver
                        </button>
                      </form>
                      <ConfirmFormButton
                        action={permanentlyDeletePractitioner}
                        hiddenFields={{ profile_id: p.id }}
                        confirmTitle={`Supprimer définitivement ${p.full_name ?? "ce compte"} ?`}
                        confirmMessage="Son historique (demandes, congés, fermetures) sera effacé. Cette action est irréversible."
                        className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--accent-warm)] transition-colors whitespace-nowrap"
                      >
                        Supprimer définitivement
                      </ConfirmFormButton>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
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

function Empty({ label }: { label: string }) {
  return (
    <p className="mt-5 py-6 text-sm text-[var(--ink-discreet)] text-center border border-dashed border-[var(--line-strong)]">
      {label}
    </p>
  );
}
