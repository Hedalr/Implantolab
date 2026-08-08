/**
 * Rate-limits applicatifs process-local (pas Redis).
 * Défense en profondeur anti-spam — chaque dyno a ses compteurs.
 */

export type RateLimitResult =
  | { limited: false }
  | { limited: true; retryAfterSec: number };

export type RateLimitPolicy = {
  max: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  windowStartedAt: number;
};

/** Plafond photos par demande — aligné web createRequest (max 6). */
export const MAX_REQUEST_PHOTOS = 6;

/** Politiques nommées (S7 / S10 / S12 / S13). */
export const RATE_LIMITS = {
  /** POST /messages — N/min/sender */
  messages: { max: 30, windowMs: 60_000 },
  /** POST /push/register — N/min/profile */
  pushRegister: { max: 20, windowMs: 60_000 },
  /** POST leave + action addLeaveRequest */
  leaveCreate: { max: 10, windowMs: 15 * 60_000 },
  /** POST closure + action addClosurePeriod */
  closureCreate: { max: 10, windowMs: 15 * 60_000 },
  /** POST announcements + action createAnnouncement */
  announcementCreate: { max: 10, windowMs: 15 * 60_000 },
  /**
   * Action web createRequest — miroir plafond DB demandes (5 / 15 min).
   * L’API create reste sur le trigger DB (hors scope P2-2).
   */
  requestCreateAction: { max: 5, windowMs: 15 * 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

const stores = new Map<string, Map<string, Bucket>>();

function getStore(bucketName: string): Map<string, Bucket> {
  let store = stores.get(bucketName);
  if (!store) {
    store = new Map();
    stores.set(bucketName, store);
    return store;
  }
  return store;
}

function prune(store: Map<string, Bucket>, windowMs: number, now: number) {
  for (const [key, bucket] of store) {
    if (now - bucket.windowStartedAt >= windowMs) store.delete(key);
  }
}

/**
 * Consomme 1 jeton si sous le plafond ; sinon `{ limited: true }`.
 * Fenêtre fixe glissante au premier hit de la fenêtre.
 */
export function consumeRateLimit(
  bucketName: string,
  key: string,
  policy: RateLimitPolicy,
): RateLimitResult {
  const now = Date.now();
  const store = getStore(bucketName);
  if (store.size > 5000) prune(store, policy.windowMs, now);

  const existing = store.get(key);
  if (!existing || now - existing.windowStartedAt >= policy.windowMs) {
    store.set(key, { count: 1, windowStartedAt: now });
    return { limited: false };
  }

  if (existing.count >= policy.max) {
    const retryAfterMs = Math.max(
      policy.windowMs - (now - existing.windowStartedAt),
      1_000,
    );
    return {
      limited: true,
      retryAfterSec: Math.ceil(retryAfterMs / 1000),
    };
  }

  existing.count += 1;
  return { limited: false };
}

/** Réponse API standard 429 + Retry-After. */
export function rateLimitedJson(retryAfterSec: number): Response {
  return Response.json(
    { error: "rate_limit" },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

/** Test-only : vide tous les buckets. */
export function __resetAppRateLimitsForTests(): void {
  stores.clear();
}
