import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
  withAdminTimeout,
} from "@/lib/supabase/admin";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { InviteUserForm } from "@/components/espace-praticien/InviteUserForm";
import { listLabSectors } from "@/lib/requests/queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string; detail?: string }>;

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: "practitioner" | "prosthetist" | "admin";
  created_at: string;
};

const FEEDBACK: Record<string, { title: string; message: string }> = {
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
  "invite-validation": {
    title: "Erreur",
    message: "L’e-mail est obligatoire pour inviter un utilisateur.",
  },
  "invite-sector": {
    title: "Erreur",
    message:
      "Le secteur (Numérique, Amovible ou Conjoint) est obligatoire pour inviter un prothésiste.",
  },
  "service-role": {
    title: "Configuration requise",
    message:
      "Ajoutez SUPABASE_SERVICE_ROLE_KEY dans les variables d’environnement pour envoyer des invitations.",
  },
  "invite-exists": {
    title: "Compte existant",
    message: "Cet e-mail est déjà enregistré.",
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
  const canInvite = isServiceRoleConfigured();

  const supabase = await getServerSupabase();
  const [{ data: profilesData }, sectors] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .in("role", ["practitioner", "prosthetist"])
      .order("created_at", { ascending: false }),
    listLabSectors(supabase),
  ]);

  const profiles = (profilesData ?? []) as ProfileRow[];

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

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Praticiens
        </h1>
        <p className="mt-2 text-[var(--ink-muted)] leading-relaxed">
          Invitez les praticiens et prothésistes par e-mail.
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
        <div className="lg:col-span-5">
          <Panel title="Inviter un utilisateur" eyebrow="Invitation">
            <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
              L’utilisateur reçoit un e-mail pour choisir son mot de passe.
              Choisissez le type de compte : praticien (dentiste) ou
              prothésiste du laboratoire (avec secteur).
            </p>
            <InviteUserForm sectors={sectors} canInvite={canInvite} />
          </Panel>
        </div>

        <div className="lg:col-span-7">
          <Panel title={`Praticiens & prothésistes (${profiles.length})`} eyebrow="Comptes">
            {profiles.length === 0 ? (
              <Empty label="Aucun compte invité pour le moment." />
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
                    <span className="text-xs tracking-wide uppercase text-[var(--ink-discreet)]">
                      {p.role === "prosthetist" ? "Prothésiste" : "Praticien"}
                    </span>
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

function Empty({ label }: { label: string }) {
  return (
    <p className="mt-5 py-6 text-sm text-[var(--ink-discreet)] text-center border border-dashed border-[var(--line-strong)]">
      {label}
    </p>
  );
}
