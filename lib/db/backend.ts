export type DataBackend = "supabase" | "postgres";

/**
 * Sélection du backend données / auth.
 * - `supabase` (défaut) : prod / test actuelles, inchangées
 * - `postgres` : Docker local / futur Scalingo HDS
 *
 * Valeurs inconnues : fallback supabase en dev ; throw en production
 * (fail-closed — évite un cutover Scalingo silencieux vers le mauvais mode).
 */
export function getDataBackend(): DataBackend {
  const raw = (process.env.DATA_BACKEND ?? "supabase").trim().toLowerCase();
  if (raw === "postgres") return "postgres";
  if (raw === "supabase" || raw === "") return "supabase";

  const message = `Invalid DATA_BACKEND="${raw}". Expected "supabase" or "postgres".`;
  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }
  console.warn(`[db] ${message} Falling back to supabase.`);
  return "supabase";
}

export function isPostgresBackend(): boolean {
  return getDataBackend() === "postgres";
}
