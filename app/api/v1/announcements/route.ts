import { NextRequest } from "next/server";
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
import {
  createAnnouncementPg,
  listActiveAnnouncementsPg,
  listAllAnnouncementsPg,
  type PgAnnouncementRow,
} from "@/lib/announcements/pg";
import { isPostgresBackend } from "@/lib/db/backend";
import { notifyAdminAnnouncement } from "@/lib/push/notify";

export const runtime = "nodejs";

function announcementToJson(row: PgAnnouncementRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    created_by: row.created_by,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

/** Parse ISO or `datetime-local` (sans fuseau) en Date. */
function parseExpiresAt(raw: unknown): Date | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;

  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  if (profile.role === "admin") {
    const rows = await listAllAnnouncementsPg();
    return json({ announcements: rows.map(announcementToJson) });
  }

  if (profile.role !== "practitioner") {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await listActiveAnnouncementsPg();
  return json({ announcements: rows.map(announcementToJson) });
}

export async function POST(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;

  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  if (profile.role !== "admin") {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const rate = consumeRateLimit(
    "announcementCreate",
    profile.id,
    RATE_LIMITS.announcementCreate,
  );
  if (rate.limited) return rateLimitedJson(rate.retryAfterSec);

  let body: {
    title?: string;
    body?: string;
    expiresAt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const message = String(body.body ?? "").trim();
  const expiresAt = parseExpiresAt(body.expiresAt);
  if (!expiresAt) {
    return json({ error: "expires" }, { status: 400 });
  }

  const result = await createAnnouncementPg({
    title,
    body: message,
    expiresAt,
    createdBy: profile.id,
  });

  if (!result.ok) {
    const status =
      result.error === "title" ||
      result.error === "body" ||
      result.error === "expires" ||
      result.error === "validation"
        ? 400
        : 500;
    return json({ error: result.error }, { status });
  }

  // Push best-effort — ne bloque pas la réponse.
  void notifyAdminAnnouncement({ title, body: message }).catch((error) => {
    console.error("[api/v1/announcements] push", error);
  });

  return json({ id: result.id }, { status: 201 });
}
