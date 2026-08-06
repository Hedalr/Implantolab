import type { NavLink } from "@/content/fr/site";
import {
  MODIFICATION_PROTHESE_CATEGORY,
  REQUEST_INBOX_LABEL,
} from "@/lib/requests/types";
import type { LabSector } from "@/lib/sectors";

export type ProfileRole =
  | "practitioner"
  | "admin"
  | "prosthetist"
  | "chef_de_secteur";

/** Rôles labo liés à un secteur de production. */
export const SECTOR_LAB_ROLES = ["prosthetist", "chef_de_secteur"] as const;

export type SectorLabRole = (typeof SECTOR_LAB_ROLES)[number];

export type InviteRole = "practitioner" | SectorLabRole;

export function isSectorLabRole(role: ProfileRole): role is SectorLabRole {
  return (SECTOR_LAB_ROLES as readonly string[]).includes(role);
}

export function parseInviteRole(raw: string): InviteRole {
  if (raw === "prosthetist" || raw === "chef_de_secteur") return raw;
  return "practitioner";
}

export function roleLabel(role: ProfileRole): string {
  switch (role) {
    case "chef_de_secteur":
      return "Chef de secteur";
    case "prosthetist":
      return "Prothésiste";
    case "admin":
      return "Admin";
    default:
      return "Praticien";
  }
}

export function inviteOkKey(role: InviteRole): string {
  if (role === "chef_de_secteur") return "invited-chef";
  if (role === "prosthetist") return "invited-prosthetist";
  return "invited";
}

export function deleteOkKey(role: string): string {
  if (role === "chef_de_secteur") return "deleted-chef";
  if (role === "prosthetist") return "deleted-prosthetist";
  return "deleted";
}

const practitionerNav: NavLink[] = [
  { href: "/espace-praticien/demandes", label: "Demandes" },
  { href: "/espace-praticien/fermetures", label: "Fermetures" },
  { href: "/espace-praticien/actualites", label: "Actualités" },
];

function buildAdminNav(sectors: LabSector[] = []): NavLink[] {
  const laboratoireChildren: NavLink[] = sectors.map((sector) => ({
    href: `/espace-praticien/laboratoire?sector=${sector.id}`,
    label: sector.name,
  }));

  return [
    { href: "/espace-praticien/admin", label: "Vue d'ensemble" },
    {
      href: "/espace-praticien/admin/praticiens",
      label: "Praticiens",
      children: [
        {
          href: "/espace-praticien/admin/calendrier",
          label: "Fermetures dentistes",
        },
      ],
    },
    {
      href: "/espace-praticien/admin/employes",
      label: "Équipe",
      children: [
        { href: "/espace-praticien/admin/conges", label: "Congés employés" },
      ],
    },
    { href: "/espace-praticien/admin/annonces", label: "Annonces" },
    { href: "/espace-praticien/admin/demandes", label: REQUEST_INBOX_LABEL },
    {
      href: "/espace-praticien/admin/modifications-prothese",
      label: MODIFICATION_PROTHESE_CATEGORY,
    },
    {
      href: "/espace-praticien/laboratoire",
      label: "Laboratoire",
      overviewLabel: "Tous les secteurs",
      ...(laboratoireChildren.length
        ? { children: laboratoireChildren }
        : {}),
    },
  ];
}

const prosthetistNav: NavLink[] = [
  { href: "/espace-praticien/laboratoire", label: "Laboratoire" },
  { href: "/espace-praticien/conges", label: "Mes congés" },
];

const chefNav: NavLink[] = [
  { href: "/espace-praticien/admin/demandes", label: REQUEST_INBOX_LABEL },
  { href: "/espace-praticien/laboratoire", label: "Laboratoire" },
  { href: "/espace-praticien/conges", label: "Mes congés" },
];

const NAV_BY_ROLE: Record<Exclude<ProfileRole, "admin">, NavLink[]> = {
  chef_de_secteur: chefNav,
  prosthetist: prosthetistNav,
  practitioner: practitionerNav,
};

const SPACE_LABEL_BY_ROLE: Record<ProfileRole, string> = {
  admin: "Espace admin",
  chef_de_secteur: "Espace chef de secteur",
  prosthetist: "Espace collaborateur",
  practitioner: "Espace praticien",
};

export function navForRole(
  role: ProfileRole | undefined | null,
  options?: { sectors?: LabSector[] },
): NavLink[] {
  if (!role) return practitionerNav;
  if (role === "admin") return buildAdminNav(options?.sectors);
  return NAV_BY_ROLE[role];
}

export function spaceLabelForRole(
  role: ProfileRole | undefined | null,
): string {
  if (!role) return SPACE_LABEL_BY_ROLE.practitioner;
  return SPACE_LABEL_BY_ROLE[role];
}

export function homePathForRole(role: ProfileRole | undefined | null): string {
  switch (role) {
    case "admin":
      return "/espace-praticien/admin";
    case "chef_de_secteur":
      return "/espace-praticien/admin/demandes";
    case "prosthetist":
      return "/espace-praticien/laboratoire";
    default:
      return "/espace-praticien/demandes";
  }
}
