import { NextRequest } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import { getSql } from "@/lib/db/client";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { canAccessRequest } from "@/lib/api/v1/access";
import { isUuid } from "@/lib/api/v1/ids";
import { updateLabRequestStatusPg } from "@/lib/requests/pg";
import { allowedSubjectsForRole } from "@/lib/requests/types";
import { isSectorLabRole } from "@/lib/roles";

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
  // Anti-énumération : id invalide / inconnu / hors scope → même 403.
  if (!isUuid(id) || !(await canAccessRequest(profile, id))) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      subject: string;
      message: string;
      patient_name: string | null;
      status: string;
      sector_id: string | null;
      profile_id: string;
      created_by: string | null;
      created_at: Date;
      owner_name: string | null;
      sector_name: string | null;
      sector_color: string | null;
      creator_name: string | null;
    }[]
  >`
    select r.id::text,
           r.subject,
           r.message,
           r.patient_name,
           r.status,
           r.sector_id::text,
           r.profile_id::text,
           r.created_by::text,
           r.created_at,
           p.full_name as owner_name,
           s.name as sector_name,
           s.color as sector_color,
           coalesce(creator.full_name, p.full_name) as creator_name
      from public.requests r
      join public.profiles p on p.id = r.profile_id
      left join public.sectors s on s.id = r.sector_id
      left join public.profiles creator on creator.id = r.created_by
     where r.id = ${id}::uuid
     limit 1
  `;

  const row = rows[0];
  if (!row) return json({ error: "not_found" }, { status: 404 });

  return json({ request: row });
}

/** Ouvrir / fermer une demande (staff labo). */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  const isAdmin = profile.role === "admin";
  if (!isAdmin && !isSectorLabRole(profile.role)) {
    return json({ error: "forbidden" }, { status: 403 });
  }
  if (isSectorLabRole(profile.role) && !profile.sectorId) {
    return json({ error: "forbidden" }, { status: 403 });
  }
  if (!isUuid(id) || !(await canAccessRequest(profile, id))) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const status = body.status === "closed" ? "closed" : body.status === "open" ? "open" : null;
  if (!status) {
    return json({ error: "invalid_status" }, { status: 400 });
  }

  const labSubjects = allowedSubjectsForRole(profile.role);
  const ok = await updateLabRequestStatusPg({
    requestId: id,
    status,
    scope: isSectorLabRole(profile.role)
      ? { sectorId: profile.sectorId as string }
      : "admin",
    // P2-7 / S5 : prothésiste ne peut pas PATCH Question/Urgence.
    subjects: labSubjects,
  });
  if (!ok) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  return json({ ok: true, status });
}
