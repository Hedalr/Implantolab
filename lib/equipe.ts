export const EQUIPE_TABS = [
  "membres",
  "invitations",
  "secteurs",
  "conges",
] as const;

export type EquipeTab = (typeof EQUIPE_TABS)[number];

export const EQUIPE_TAB_LABELS: Record<EquipeTab, string> = {
  membres: "Membres",
  invitations: "Invitations",
  secteurs: "Secteurs",
  conges: "Congés",
};

export const EQUIPE_PATH = "/espace-praticien/admin/employes";

export function parseEquipeTab(raw: string | undefined | null): EquipeTab {
  if (raw && (EQUIPE_TABS as readonly string[]).includes(raw)) {
    return raw as EquipeTab;
  }
  return "membres";
}

export function equipeHref(
  tab: EquipeTab,
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (tab !== "membres") {
    params.set("tab", tab);
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${EQUIPE_PATH}?${query}` : EQUIPE_PATH;
}
