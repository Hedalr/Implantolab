import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import {
  isServiceRoleConfigured,
  loadAuthEmailById,
} from "@/lib/supabase/admin";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import {
  SECTOR_LAB_ROLES,
  roleLabel,
  type SectorLabRole,
} from "@/lib/roles";
import { firstRelation } from "@/lib/supabase/relation";
import { parseEquipeTab, equipeHref } from "@/lib/equipe";
import { EquipeTabs } from "@/components/espace-praticien/equipe/EquipeTabs";
import {
  EquipeMembersTable,
  type EquipeMember,
} from "@/components/espace-praticien/equipe/EquipeMembersTable";
import {
  EquipeSectorsPanel,
  type EquipeSectorCard,
} from "@/components/espace-praticien/equipe/EquipeSectorsPanel";
import {
  EquipeLeavesPanel,
  EquipeLeaveFeedback,
  EQUIPE_LEAVE_FEEDBACK,
  mapLeaveRows,
  usedDaysByProfile,
  type LeaveRequestDbRow,
} from "@/components/espace-praticien/equipe/EquipeLeavesPanel";
import { InviteUserForm } from "@/components/espace-praticien/InviteUserForm";
import { ConfirmFormButton } from "@/components/espace-praticien/ConfirmFormButton";
import {
  permanentlyDeletePractitioner,
  reactivatePractitioner,
} from "@/app/espace-praticien/admin/praticiens/actions";
import type { LabSector } from "@/lib/sectors";

export const metadata: Metadata = {
  title: "Équipe — Espace praticien",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  ok?: string;
  error?: string;
  detail?: string;
}>;

type SectorRow = {
  id: string;
  name: string;
  color: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: SectorLabRole;
  sector_id: string | null;
  leave_balance_days: number | null;
  deleted_at: string | null;
  sectors: { name: string | null; color: string | null } | null;
};

const FEEDBACK: Record<string, { title: string; message: string }> = {
  "sector-created": {
    title: "Secteur créé",
    message: "Le nouveau secteur d’activité est disponible.",
  },
  "sector-updated": {
    title: "Secteur mis à jour",
    message: "Le nom ou la couleur du secteur ont été enregistrés.",
  },
  "sector-deleted": {
    title: "Secteur supprimé",
    message:
      "Le secteur a été supprimé. Les employés qui y étaient rattachés sont désormais non classés.",
  },
  "employee-sector": {
    title: "Secteur mis à jour",
    message: "Le rattachement de l’employé a bien été enregistré.",
  },
  "employee-balance": {
    title: "Solde mis à jour",
    message: "Le solde de congés de l’employé a été mis à jour.",
  },
  "sector-name": {
    title: "Erreur",
    message: "Le nom du secteur doit contenir entre 2 et 80 caractères.",
  },
  "sector-color": {
    title: "Erreur",
    message:
      "La couleur du secteur doit être un code hexadécimal valide (ex. #2563eb).",
  },
  "sector-duplicate": {
    title: "Nom déjà utilisé",
    message: "Un autre secteur porte déjà ce nom.",
  },
  "sector-save": {
    title: "Erreur",
    message: "Impossible d’enregistrer le secteur. Merci de réessayer.",
  },
  "sector-delete": {
    title: "Erreur",
    message: "Impossible de supprimer le secteur.",
  },
  "sector-validation": {
    title: "Erreur",
    message: "Secteur invalide.",
  },
  "employee-validation": {
    title: "Erreur",
    message: "Employé invalide.",
  },
  "employee-balance-invalid": {
    title: "Erreur",
    message: "Le solde doit être un nombre entier entre 0 et 365.",
  },
  "employee-save": {
    title: "Erreur",
    message: "Impossible d’enregistrer la modification.",
  },
  invited: {
    title: "Invitation envoyée",
    message:
      "Le collaborateur recevra un e-mail pour définir son mot de passe.",
  },
  "invited-prosthetist": {
    title: "Invitation envoyée",
    message:
      "Le prothésiste recevra un e-mail pour définir son mot de passe et accéder au module laboratoire.",
  },
  "invited-chef": {
    title: "Invitation envoyée",
    message:
      "Le chef de secteur recevra un e-mail pour définir son mot de passe et accéder aux questions/urgences et au laboratoire.",
  },
  "invite-validation": {
    title: "Erreur",
    message: "L’e-mail est obligatoire pour inviter un utilisateur.",
  },
  "invite-sector": {
    title: "Erreur",
    message: "Le secteur est obligatoire pour inviter un collaborateur labo.",
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
    message:
      "L’invitation n’a pas pu être envoyée. Vérifiez l’e-mail et réessayez.",
  },
  "invite-rate-limit": {
    title: "Quota d’e-mails atteint",
    message:
      "Le SMTP par défaut de Supabase est limité à 2 e-mails/heure. Attendez 1 h ou configurez un SMTP custom.",
  },
  "invite-smtp": {
    title: "Erreur SMTP",
    message:
      "Supabase n’a pas pu envoyer l’e-mail. Vérifiez la configuration SMTP.",
  },
  "invite-profile": {
    title: "Erreur partielle",
    message:
      "L’invitation a été envoyée mais la mise à jour du profil a échoué.",
  },
  "invite-exists-deleted": {
    title: "Compte désactivé",
    message:
      "Cette adresse appartient à un compte désactivé. Utilisez « Réactiver » ci-dessous.",
  },
  "deleted-prosthetist": {
    title: "Accès révoqué",
    message:
      "Le prothésiste n’a plus accès. Son historique est conservé ; vous pouvez le réactiver.",
  },
  "deleted-chef": {
    title: "Accès révoqué",
    message:
      "Le chef de secteur n’a plus accès. Son historique est conservé ; vous pouvez le réactiver.",
  },
  deleted: {
    title: "Accès révoqué",
    message: "Le compte n’a plus accès. Vous pouvez le réactiver plus tard.",
  },
  reactivated: {
    title: "Compte réactivé",
    message:
      "L’accès a été rétabli. Un e-mail lui a été envoyé pour définir un nouveau mot de passe.",
  },
  "reactivate-partial": {
    title: "Compte réactivé",
    message:
      "L’accès a été rétabli mais l’e-mail de reconnexion n’a pas pu être envoyé.",
  },
  "reactivate-failed": {
    title: "Erreur",
    message: "Impossible de réactiver ce compte.",
  },
  "delete-validation": {
    title: "Erreur",
    message: "Impossible d’identifier ce compte.",
  },
  "delete-failed": {
    title: "Erreur",
    message: "La révocation de l’accès a échoué.",
  },
  "deleted-permanently": {
    title: "Compte supprimé",
    message:
      "Le compte et son historique ont été supprimés définitivement.",
  },
};

export default async function AdminEquipePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { tab: rawTab, ok, error, detail } = await searchParams;
  const tab = parseEquipeTab(rawTab);
  const feedbackKey = ok ?? error;
  const feedback = feedbackKey ? FEEDBACK[feedbackKey] : null;
  const isLeaveFeedback = Boolean(
    feedbackKey && feedbackKey in EQUIPE_LEAVE_FEEDBACK,
  );
  const canInvite = isServiceRoleConfigured();
  const needsEmails = tab === "membres" || tab === "invitations";

  const supabase = await getServerSupabase();

  const [
    { data: sectorsData },
    { data: profilesData },
    { data: leavesData },
    emailById,
  ] = await Promise.all([
    supabase.from("sectors").select("id, name, color").order("name", {
      ascending: true,
    }),
    supabase
      .from("profiles")
      .select(
        "id, full_name, role, sector_id, leave_balance_days, deleted_at, sectors ( name, color )",
      )
      .in("role", [...SECTOR_LAB_ROLES])
      .order("full_name", { ascending: true }),
    supabase
      .from("leave_requests")
      .select(
        "id, profile_id, start_date, end_date, days_count, note, status, profiles ( full_name, sector_id, sectors ( name, color ) )",
      )
      .order("start_date", { ascending: true }),
    needsEmails
      ? loadAuthEmailById("admin/employes")
      : Promise.resolve(new Map<string, string>()),
  ]);

  const sectors = (sectorsData ?? []) as SectorRow[];
  const profiles = (profilesData ?? []) as unknown as ProfileRow[];
  const activeProfiles = profiles.filter((p) => !p.deleted_at);
  const deactivatedProfiles = profiles.filter((p) => p.deleted_at);

  const leaves = mapLeaveRows(
    (leavesData ?? []) as unknown as LeaveRequestDbRow[],
  );
  const usedByProfile = usedDaysByProfile(leaves);

  const members: EquipeMember[] = activeProfiles.map((p) => {
    const sector = firstRelation(p.sectors);
    return {
      id: p.id,
      fullName: p.full_name,
      email: emailById.get(p.id) ?? null,
      role: p.role,
      sectorId: p.sector_id,
      sectorName: sector?.name ?? null,
      sectorColor: sector?.color ?? null,
      leaveBalanceDays: p.leave_balance_days ?? 0,
      usedDays: usedByProfile.get(p.id) ?? 0,
    };
  });

  const sectorCards: EquipeSectorCard[] = sectors.map((s) => {
    const inSector = activeProfiles.filter((p) => p.sector_id === s.id);
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      memberCount: inSector.length,
      chefCount: inSector.filter((p) => p.role === "chef_de_secteur").length,
    };
  });

  const leaveEmployees = members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    sectorId: m.sectorId,
    sectorName: m.sectorName,
    sectorColor: m.sectorColor,
  }));

  const pendingLeavesCount = leaves.filter((l) => l.status === "pending")
    .length;
  const unclassifiedCount = members.filter((m) => !m.sectorId).length;

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-6 max-w-3xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Équipe
        </h1>
        <p className="mt-2 text-[var(--ink-muted)] leading-relaxed">
          Prothésistes et chefs de secteur — invitations, secteurs et congés.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-6 text-sm">
        <Stat label="Actifs" value={members.length} />
        <Stat
          label="Sans secteur"
          value={unclassifiedCount}
          warn={unclassifiedCount > 0}
        />
        <Stat
          label="Congés en attente"
          value={pendingLeavesCount}
          warn={pendingLeavesCount > 0}
        />
      </div>

      <EquipeTabs active={tab} pendingLeaves={pendingLeavesCount} />

      <div className="mt-8">
        {isLeaveFeedback ? (
          <EquipeLeaveFeedback ok={ok} error={error} />
        ) : feedback ? (
          <div
            role="status"
            className={cn(
              "mb-8 border-l-4 pl-4 py-3 bg-[var(--bg-elevated)] max-w-3xl",
              error ? "border-[var(--ink)]" : "border-[var(--accent-warm)]",
            )}
          >
            <p className="text-sm font-medium text-[var(--ink)]">
              {feedback.title}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {feedback.message}
            </p>
            {error && detail ? (
              <p className="mt-2 text-xs font-mono text-[var(--ink-discreet)] break-all">
                Détail technique : {detail}
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === "membres" ? (
          <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8">
            <p className="text-eyebrow">Directory</p>
            <h2 className="mt-1 font-serif text-xl text-[var(--ink)]">
              Membres ({members.length})
            </h2>
            <div className="mt-6">
              <EquipeMembersTable members={members} sectors={sectors} />
            </div>
          </section>
        ) : null}

        {tab === "invitations" ? (
          <InvitationsTab
            sectors={sectors}
            canInvite={canInvite}
            deactivated={deactivatedProfiles.map((p) => ({
              id: p.id,
              fullName: p.full_name,
              email: emailById.get(p.id) ?? null,
              role: p.role,
              deletedAt: p.deleted_at,
            }))}
          />
        ) : null}

        {tab === "secteurs" ? (
          <EquipeSectorsPanel sectors={sectorCards} />
        ) : null}

        {tab === "conges" ? (
          <EquipeLeavesPanel
            leaves={leaves}
            employees={leaveEmployees}
            returnPath={equipeHref("conges")}
          />
        ) : null}
      </div>
    </Container>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div>
      <p
        className={cn(
          "text-2xl font-serif text-numeral",
          warn ? "text-[var(--accent-warm)]" : "text-[var(--ink)]",
        )}
      >
        {value}
      </p>
      <p className="text-xs text-[var(--ink-discreet)] tracking-wide uppercase">
        {label}
      </p>
    </div>
  );
}

function InvitationsTab({
  sectors,
  canInvite,
  deactivated,
}: {
  sectors: LabSector[];
  canInvite: boolean;
  deactivated: {
    id: string;
    fullName: string | null;
    email: string | null;
    role: SectorLabRole;
    deletedAt: string | null;
  }[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8">
          <p className="text-eyebrow">Invitation</p>
          <h2 className="mt-1 font-serif text-xl text-[var(--ink)]">
            Inviter un collaborateur
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
            Prothésiste ou chef de secteur uniquement. Les dentistes s’invitent
            depuis la page Praticiens.
          </p>
          {!canInvite ? (
            <p className="mt-4 text-sm text-[var(--ink-muted)] leading-relaxed border border-[var(--line-strong)] p-4">
              Ajoutez{" "}
              <code className="text-[var(--ink)]">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              pour envoyer des invitations.
            </p>
          ) : null}
          <InviteUserForm
            sectors={sectors}
            canInvite={canInvite}
            mode="lab"
          />
        </section>
      </div>

      <div className="lg:col-span-7">
        <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8">
          <p className="text-eyebrow">Historique</p>
          <h2 className="mt-1 font-serif text-xl text-[var(--ink)]">
            Comptes désactivés ({deactivated.length})
          </h2>
          {deactivated.length === 0 ? (
            <p className="mt-5 py-6 text-sm text-[var(--ink-discreet)] text-center border border-dashed border-[var(--line-strong)]">
              Aucun compte labo désactivé.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
                Réactivez un compte pour lui redonner accès, ou supprimez-le
                définitivement.
              </p>
              <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {deactivated.map((p) => (
                  <li
                    key={p.id}
                    className="py-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div>
                      <p className="text-[var(--ink-muted)]">
                        {p.fullName ?? "Sans nom"}
                      </p>
                      <p className="text-xs text-[var(--ink-discreet)]">
                        {p.email ?? "E-mail non disponible"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs tracking-wide uppercase text-[var(--ink-discreet)]">
                        {roleLabel(p.role)}
                      </span>
                      <form action={reactivatePractitioner}>
                        <input type="hidden" name="profile_id" value={p.id} />
                        <input
                          type="hidden"
                          name="return_path"
                          value={equipeHref("invitations")}
                        />
                        <button
                          type="submit"
                          className="text-xs tracking-wide uppercase text-[var(--ink)] hover:text-[var(--accent-warm)] transition-colors whitespace-nowrap"
                        >
                          Réactiver
                        </button>
                      </form>
                      <ConfirmFormButton
                        action={permanentlyDeletePractitioner}
                        hiddenFields={{
                          profile_id: p.id,
                          return_path: equipeHref("invitations"),
                        }}
                        confirmTitle={`Supprimer définitivement ${p.fullName ?? "ce compte"} ?`}
                        confirmMessage="Cette action est irréversible."
                        className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--accent-warm)] transition-colors whitespace-nowrap"
                      >
                        Supprimer définitivement
                      </ConfirmFormButton>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
