/**
 * Forme UUID acceptée par Postgres (`::uuid`), y compris les IDs seed
 * non-RFC (variant/version libres). Fail-closed avant cast pour éviter 500.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
