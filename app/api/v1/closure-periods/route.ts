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
  createClosurePeriodPg,
  listAllClosurePeriodsPg,
  listMyClosurePeriodsPg,
  type PgClosurePeriodRow,
} from "@/lib/closures/pg";
import { isPostgresBackend } from "@/lib/db/backend";

export const runtime = "nodejs";

function closureToJson(row: PgClosurePeriodRow) {
  return {
    id: row.id,
    profile_id: row.profile_id,
    start_date: row.start_date,
    end_date: row.end_date,
    note: row.note,
    created_at: row.created_at,
    profile_name: row.full_name,
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
    const rows = await listAllClosurePeriodsPg();
    return json({ closure_periods: rows.map(closureToJson) });
  }

  if (profile.role !== "practitioner") {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await listMyClosurePeriodsPg(profile.id);
  return json({ closure_periods: rows.map(closureToJson) });
}

export async function POST(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;

  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  if (profile.role !== "practitioner") {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const rate = consumeRateLimit(
    "closureCreate",
    profile.id,
    RATE_LIMITS.closureCreate,
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

  const result = await createClosurePeriodPg({
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
        : 500;
    return json({ error: result.error }, { status });
  }

  return json({ id: result.id }, { status: 201 });
}
