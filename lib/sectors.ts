/**
 * Secteurs de production du laboratoire.
 * Noms alignés sur le seed de `supabase/migrations/005_request_sectors.sql`.
 */

export const LAB_SECTOR_NAMES = ["Numérique", "Amovible", "Conjoint"] as const;

export type LabSectorName = (typeof LAB_SECTOR_NAMES)[number];

export function isLabSectorName(value: string): value is LabSectorName {
  return (LAB_SECTOR_NAMES as readonly string[]).includes(value);
}

export type LabSector = {
  id: string;
  name: string;
  color: string;
};

export function sortLabSectors(sectors: LabSector[]): LabSector[] {
  const order = new Map(
    LAB_SECTOR_NAMES.map((name, index) => [name, index] as const),
  );
  return [...sectors].sort((a, b) => {
    const ai = order.get(a.name as LabSectorName) ?? 99;
    const bi = order.get(b.name as LabSectorName) ?? 99;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, "fr");
  });
}
