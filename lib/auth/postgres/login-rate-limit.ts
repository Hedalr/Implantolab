/**
 * Rate-limit / lockout login (process-local).
 * Défense en profondeur anti-bruteforce — pas un store distribué.
 * Sur multi-dyno Scalingo chaque instance a son compteur (OK en P1 local/HDS).
 */

type Bucket = {
  failures: number;
  windowStartedAt: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 10;
const MAX_FAILURES_PER_IP = 40;

const byEmail = new Map<string, Bucket>();
const byIp = new Map<string, Bucket>();

function prune(map: Map<string, Bucket>, now: number) {
  for (const [key, bucket] of map) {
    if (now - bucket.windowStartedAt >= WINDOW_MS) map.delete(key);
  }
}

function getOrReset(map: Map<string, Bucket>, key: string, now: number): Bucket {
  const existing = map.get(key);
  if (!existing || now - existing.windowStartedAt >= WINDOW_MS) {
    const fresh = { failures: 0, windowStartedAt: now };
    map.set(key, fresh);
    return fresh;
  }
  return existing;
}

export type LoginRateLimitResult =
  | { limited: false }
  | { limited: true; retryAfterSec: number };

export function checkLoginRateLimit(
  email: string,
  ip: string,
): LoginRateLimitResult {
  const now = Date.now();
  if (byEmail.size > 5000 || byIp.size > 5000) {
    prune(byEmail, now);
    prune(byIp, now);
  }

  const emailKey = email.trim().toLowerCase();
  const ipKey = ip || "unknown";
  const emailBucket = getOrReset(byEmail, emailKey, now);
  const ipBucket = getOrReset(byIp, ipKey, now);

  if (
    emailBucket.failures >= MAX_FAILURES_PER_EMAIL ||
    ipBucket.failures >= MAX_FAILURES_PER_IP
  ) {
    const emailRemaining = WINDOW_MS - (now - emailBucket.windowStartedAt);
    const ipRemaining = WINDOW_MS - (now - ipBucket.windowStartedAt);
    const retryAfterMs = Math.max(
      emailBucket.failures >= MAX_FAILURES_PER_EMAIL ? emailRemaining : 0,
      ipBucket.failures >= MAX_FAILURES_PER_IP ? ipRemaining : 0,
      1_000,
    );
    return {
      limited: true,
      retryAfterSec: Math.ceil(retryAfterMs / 1000),
    };
  }

  return { limited: false };
}

export function recordLoginFailure(email: string, ip: string): void {
  const now = Date.now();
  const emailKey = email.trim().toLowerCase();
  const ipKey = ip || "unknown";
  const emailBucket = getOrReset(byEmail, emailKey, now);
  const ipBucket = getOrReset(byIp, ipKey, now);
  emailBucket.failures += 1;
  ipBucket.failures += 1;
}

/** Succès : reset le bucket email (IP conservé pour mitiger spray). */
export function clearLoginFailuresForEmail(email: string): void {
  byEmail.delete(email.trim().toLowerCase());
}

/** Test-only : vide les buckets (smoke S3). */
export function __resetLoginRateLimitForTests(): void {
  byEmail.clear();
  byIp.clear();
}

export const LOGIN_RATE_LIMIT = {
  WINDOW_MS,
  MAX_FAILURES_PER_EMAIL,
  MAX_FAILURES_PER_IP,
} as const;
