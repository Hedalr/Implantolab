/**
 * Aplatit une relation Supabase imbriquée pouvant être typée objet, tableau
 * ou null selon la version des types générés.
 */
export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
