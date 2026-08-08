import { NextRequest } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import { getSql } from "@/lib/db/client";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import {
  consumeRateLimit,
  RATE_LIMITS,
  rateLimitedJson,
} from "@/lib/api/v1/rate-limit";
import { isExpoPushToken } from "@/lib/push/token-format";

export const runtime = "nodejs";

/**
 * Remplace RPC Supabase register_push_token — sans reclaim cross-user.
 * Un token déjà lié à un autre profil → 409 (pas de vol de notifs).
 * Handoff appareil sans DELETE préalable → 409 volontaire (voir docs + TTL).
 */
export async function POST(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  const rate = consumeRateLimit(
    "pushRegister",
    profile.id,
    RATE_LIMITS.pushRegister,
  );
  if (rate.limited) return rateLimitedJson(rate.retryAfterSec);

  let body: { token?: string; platform?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const platform = String(body.platform ?? "").trim();
  if (!token) return json({ error: "token_required" }, { status: 400 });
  if (!isExpoPushToken(token)) {
    return json({ error: "invalid_token_format" }, { status: 400 });
  }
  if (platform !== "ios" && platform !== "android") {
    return json({ error: "invalid_platform" }, { status: 400 });
  }

  const sql = getSql();
  // ON CONFLICT : maj platform/updated_at seulement si même owner.
  // WHERE faux (autre profil) → 0 row RETURNING → 409 (pas de hijack).
  const rows = await sql<{ id: string }[]>`
    insert into public.push_tokens (profile_id, token, platform, updated_at)
    values (${profile.id}::uuid, ${token}, ${platform}, now())
    on conflict (token) do update
      set platform = excluded.platform,
          updated_at = now()
    where push_tokens.profile_id = ${profile.id}::uuid
    returning id::text
  `;

  if (rows.length === 0) {
    return json({ error: "token_owned_by_other" }, { status: 409 });
  }

  return json({ ok: true });
}

/** DELETE scoped : token obligatoire + ownership (profile_id = session). */
export async function DELETE(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  if (!token) {
    return json({ error: "token_required" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    delete from public.push_tokens
     where profile_id = ${profile.id}::uuid
       and token = ${token}
  `;

  return json({ ok: true });
}
