import { NextRequest } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { isUuid } from "@/lib/api/v1/ids";
import { notifyAfterRequestCreated } from "@/lib/api/v1/notify";
import { listRequestsForApi, sectorExistsPg } from "@/lib/requests/pg";
import { isRequestCategory } from "@/lib/requests/types";
import { getSql } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  const status = request.nextUrl.searchParams.get("status");
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get("limit") ?? 50) || 50,
    200,
  );
  const filterStatus = status === "open" || status === "closed" ? status : null;

  const rawSector = request.nextUrl.searchParams.get("sectorId")?.trim() || null;
  if (profile.role === "admin" && rawSector && !isUuid(rawSector)) {
    return json({ error: "invalid_sector" }, { status: 400 });
  }
  const filterSectorId =
    profile.role === "admin" && rawSector ? rawSector : null;

  const subjectsParam = request.nextUrl.searchParams.get("subjects");
  const subjects = subjectsParam
    ? subjectsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  const rows = await listRequestsForApi({
    role: profile.role,
    profileId: profile.id,
    sectorId: profile.sectorId,
    status: filterStatus,
    limit,
    filterSectorId,
    subjects,
  });

  return json({ requests: rows });
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

  let body: {
    subject?: string;
    message?: string;
    patientName?: string;
    sectorId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  const patientName = String(body.patientName ?? "").trim();
  const sectorId = String(body.sectorId ?? "").trim();

  if (!isRequestCategory(subject)) {
    return json({ error: "invalid_subject" }, { status: 400 });
  }
  if (!sectorId || !isUuid(sectorId) || !(await sectorExistsPg(sectorId))) {
    return json({ error: "invalid_sector" }, { status: 400 });
  }
  if (patientName.length < 2 || patientName.length > 120) {
    return json({ error: "invalid_patient" }, { status: 400 });
  }
  if (message.length < 10 || message.length > 2000) {
    return json({ error: "invalid_message" }, { status: 400 });
  }

  const sql = getSql();
  try {
    const rows = await sql<{ id: string }[]>`
      insert into public.requests (
        profile_id, sector_id, subject, message, patient_name, created_by
      )
      values (
        ${profile.id}::uuid,
        ${sectorId}::uuid,
        ${subject},
        ${message},
        ${patientName},
        ${profile.id}::uuid
      )
      returning id
    `;
    const id = rows[0]?.id;
    if (!id) return json({ error: "create_failed" }, { status: 500 });

    void notifyAfterRequestCreated(id).catch((err) => {
      console.error("[api/v1/requests] notify:", err);
    });

    return json({ id }, { status: 201 });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    if (messageText.includes("REQUEST_RATE_LIMIT")) {
      return json({ error: "rate_limit" }, { status: 429 });
    }
    throw error;
  }
}
