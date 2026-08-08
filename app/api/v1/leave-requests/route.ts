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
import { isPostgresBackend } from "@/lib/db/backend";
import {
  createLeaveRequestPg,
  listAllLeaveRequestsPg,
  listMyLeaveRequestsPg,
  type PgLeaveRequestRow,
} from "@/lib/leave/pg";
import { isSectorLabRole } from "@/lib/roles";

export const runtime = "nodejs";

function leaveToJson(row: PgLeaveRequestRow) {
  return {
    id: row.id,
    profile_id: row.profile_id,
    start_date: row.start_date,
    end_date: row.end_date,
    days_count: row.days_count,
    note: row.note,
    status: row.status,
    created_at: row.created_at,
    profile_name: row.full_name,
    sector_id: row.sector_id,
    sector_name: row.sector_name,
    sector_color: row.sector_color,
  };
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
    const rows = await listAllLeaveRequestsPg();
    return json({ leave_requests: rows.map(leaveToJson) });
  }

  if (!isSectorLabRole(profile.role)) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await listMyLeaveRequestsPg(profile.id);
  return json({ leave_requests: rows.map(leaveToJson) });
}

export async function POST(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;

  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  if (!isSectorLabRole(profile.role)) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const rate = consumeRateLimit(
    "leaveCreate",
    profile.id,
    RATE_LIMITS.leaveCreate,
  );
  if (rate.limited) return rateLimitedJson(rate.retryAfterSec);

  let body: {
    startDate?: string;
    endDate?: string;
    note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const startDate = String(body.startDate ?? "").trim();
  const endDate = String(body.endDate ?? "").trim();
  const note = body.note != null ? String(body.note) : undefined;

  const result = await createLeaveRequestPg({
    profileId: profile.id,
    createdBy: user.id,
    startDate,
    endDate,
    note,
  });

  if (!result.ok) {
    const status =
      result.error === "validation" ||
      result.error === "order" ||
      result.error === "note"
        ? 400
        : result.error === "balance" || result.error === "conflict"
          ? 409
          : 500;
    return json(
      { error: result.error, detail: result.detail ?? null },
      { status },
    );
  }

  return json({ id: result.id }, { status: 201 });
}
