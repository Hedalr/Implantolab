import { createHash, timingSafeEqual } from "node:crypto";

/** Plancher pour CRON_SECRET / PUSH_WEBHOOK_SECRET en mode postgres (fail-closed). */
export const MIN_BEARER_SECRET_LENGTH = 32;

function isPostgresBackendEnv(): boolean {
  return (process.env.DATA_BACKEND ?? "").trim().toLowerCase() === "postgres";
}

/**
 * Compare deux chaînes en temps constant (via SHA-256 → digest fixe).
 * Évite les fuites de timing sur Bearer secrets (CRON / webhooks).
 */
function timingSafeEqualString(a: string, b: string): boolean {
  const digA = createHash("sha256").update(a, "utf8").digest();
  const digB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(digA, digB);
}

/**
 * Vérifie `Authorization: Bearer <env>` pour les routes API internes
 * (cron Vercel, webhooks Supabase).
 *
 * Fail-closed : secret env absent → 500 (pas d’accès public).
 * En postgres : secret trop court (< {@link MIN_BEARER_SECRET_LENGTH}) → 500.
 * Mauvais / absent bearer → 401.
 * Scheme `Bearer` case-insensitive (RFC 6750).
 */
export function assertBearerSecret(
  request: Request,
  envName: string,
): Response | null {
  const secret = process.env[envName];
  if (
    !secret ||
    (isPostgresBackendEnv() && secret.length < MIN_BEARER_SECRET_LENGTH)
  ) {
    return Response.json(
      { error: "Configuration serveur manquante" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  const match = auth ? /^Bearer\s+(\S+)$/i.exec(auth.trim()) : null;
  if (!match) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = match[1];
  if (!timingSafeEqualString(token, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
