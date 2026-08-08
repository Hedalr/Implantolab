import { NextRequest } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import { getSql } from "@/lib/db/client";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { canAccessRequest, canReplyToRequest } from "@/lib/api/v1/access";
import { notifyAfterMessageCreated } from "@/lib/api/v1/notify";
import {
  consumeRateLimit,
  RATE_LIMITS,
  rateLimitedJson,
} from "@/lib/api/v1/rate-limit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });
  if (!(await canAccessRequest(profile, id))) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const sinceRaw = request.nextUrl.searchParams.get("since");
  let sinceIso: string | null = null;
  if (sinceRaw) {
    // Fail-closed : évite 500 Postgres sur cast `::timestamptz` (poll client).
    const ms = Date.parse(sinceRaw);
    if (Number.isNaN(ms)) {
      return json({ error: "invalid_since" }, { status: 400 });
    }
    sinceIso = new Date(ms).toISOString();
  }

  const sql = getSql();
  const sinceFilter = sinceIso
    ? sql`and m.created_at > ${sinceIso}::timestamptz`
    : sql``;

  const messages = await sql`
    select m.id, m.request_id, m.sender_id, m.body, m.created_at,
           p.full_name as sender_name, p.role as sender_role
      from public.request_messages m
      join public.profiles p on p.id = m.sender_id
     where m.request_id = ${id}::uuid
       ${sinceFilter}
     order by m.created_at asc
  `;

  // Mark-as-read only on full load (not on empty poll ticks).
  if (!sinceIso) {
    await sql`
      insert into public.request_thread_reads (request_id, profile_id, last_read_at)
      values (${id}::uuid, ${profile.id}::uuid, now())
      on conflict (request_id, profile_id)
      do update set last_read_at = now()
    `;
  }

  return json({ messages });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });
  if (!(await canReplyToRequest(profile, id))) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const rate = consumeRateLimit(
    "messages",
    profile.id,
    RATE_LIMITS.messages,
  );
  if (rate.limited) return rateLimitedJson(rate.retryAfterSec);

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const text = String(body.body ?? "").trim();
  if (!text || text.length > 2000) {
    return json({ error: "invalid_body" }, { status: 400 });
  }

  const sql = getSql();
  const rows = await sql<{ id: string; created_at: Date }[]>`
    insert into public.request_messages (request_id, sender_id, body)
    values (${id}::uuid, ${profile.id}::uuid, ${text})
    returning id, created_at
  `;

  const message = rows[0];
  if (!message) return json({ error: "create_failed" }, { status: 500 });

  void notifyAfterMessageCreated(id, message.id).catch((err) => {
    console.error("[api/v1/messages] notify:", err);
  });

  return json(
    {
      id: message.id,
      request_id: id,
      sender_id: profile.id,
      body: text,
      created_at: message.created_at,
      sender_name: profile.fullName,
      sender_role: profile.role,
    },
    { status: 201 },
  );
}
