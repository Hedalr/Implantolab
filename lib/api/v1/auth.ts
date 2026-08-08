import { NextRequest } from "next/server";
import {
  createPgSessionToken,
  destroyPgSessionToken,
  fetchPgProfile,
  resolvePgSessionFromToken,
  type PgProfile,
} from "@/lib/auth/postgres/session";
import { PG_SESSION_COOKIE } from "@/lib/auth/postgres/cookies";
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from "@/lib/auth/postgres/crypto";
import {
  checkLoginRateLimit,
  clearLoginFailuresForEmail,
  recordLoginFailure,
} from "@/lib/auth/postgres/login-rate-limit";
import { getSql } from "@/lib/db/client";

export function json(
  body: unknown,
  init?: { status?: number; headers?: HeadersInit },
) {
  return Response.json(body, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

/** IP client pour rate-limit login (X-Forwarded-For derrière Scalingo). */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export async function requireApiUser(
  request: NextRequest,
  opts?: { allowPasswordPending?: boolean },
): Promise<{ id: string; email: string; mustSetPassword: boolean } | Response> {
  const token =
    getBearerToken(request) ??
    request.cookies.get(PG_SESSION_COOKIE)?.value ??
    null;
  const user = await resolvePgSessionFromToken(token);
  if (!user) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.mustSetPassword && !opts?.allowPasswordPending) {
    return json({ error: "password_required" }, { status: 403 });
  }
  return user;
}

export async function loadProfile(
  userId: string,
  email: string,
): Promise<PgProfile | null> {
  return fetchPgProfile(userId, email);
}

export async function apiSignIn(
  email: string,
  password: string,
  opts?: { clientIp?: string },
): Promise<
  | { ok: true; token: string; expiresAt: Date; profile: PgProfile }
  | { ok: false; status: number; error: string; retryAfterSec?: number }
> {
  const clientIp = opts?.clientIp ?? "unknown";
  const rate = checkLoginRateLimit(email, clientIp);
  if (rate.limited) {
    return {
      ok: false,
      status: 429,
      error: "rate_limit",
      retryAfterSec: rate.retryAfterSec,
    };
  }

  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      email: string;
      password_hash: string;
      banned_until: Date | null;
      deleted_at: Date | null;
    }[]
  >`
    select u.id, u.email, u.password_hash, u.banned_until, p.deleted_at
      from public.users u
      join public.profiles p on p.id = u.id
     where lower(u.email) = lower(${email})
     limit 1
  `;

  const user = rows[0];
  // Toujours bcrypt.compare (hash réel ou dummy) — anti-énumération timing.
  const hash = user?.password_hash ?? DUMMY_PASSWORD_HASH;
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) {
    recordLoginFailure(email, clientIp);
    return { ok: false, status: 401, error: "invalid_credentials" };
  }

  // Soft-delete : même shape que mauvais mdp (pas de confirmation d’existence).
  if (user.deleted_at) {
    recordLoginFailure(email, clientIp);
    return { ok: false, status: 401, error: "invalid_credentials" };
  }

  // Ban : seulement après credentials valides (test S3 : banned → 403).
  if (user.banned_until && user.banned_until > new Date()) {
    recordLoginFailure(email, clientIp);
    return { ok: false, status: 403, error: "banned" };
  }

  clearLoginFailuresForEmail(email);

  // Rehash progressif (ex. cost 10 → 12) — best-effort, ne bloque pas le login.
  if (passwordNeedsRehash(user.password_hash)) {
    try {
      const nextHash = await hashPassword(password);
      await sql`
        update public.users
           set password_hash = ${nextHash}
         where id = ${user.id}
      `;
    } catch (err) {
      console.error("[auth] password rehash failed", err);
    }
  }

  const { token, expiresAt } = await createPgSessionToken(user.id);
  const profile = await fetchPgProfile(user.id, user.email);
  if (!profile) return { ok: false, status: 500, error: "profile_missing" };

  return { ok: true, token, expiresAt, profile };
}

export async function apiSignOut(request: NextRequest): Promise<void> {
  const token =
    getBearerToken(request) ??
    request.cookies.get(PG_SESSION_COOKIE)?.value ??
    null;
  await destroyPgSessionToken(token);
}

export function profileToJson(profile: PgProfile) {
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    fullName: profile.fullName,
    sectorId: profile.sectorId,
    sectorName: profile.sectorName,
    sectorColor: profile.sectorColor,
    leaveBalanceDays: profile.leaveBalanceDays,
  };
}
