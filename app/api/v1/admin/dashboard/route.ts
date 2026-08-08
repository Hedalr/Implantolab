import { NextRequest } from "next/server";
import { getAdminDashboardStatsPg } from "@/lib/admin/dashboard-pg";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { isPostgresBackend } from "@/lib/db/backend";
import { formatRequestCategory } from "@/lib/requests/types";

export const runtime = "nodejs";

/**
 * KPI dashboard admin (postgres only) — aligné sur `/espace-praticien/admin`.
 */
export async function GET(request: NextRequest) {
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

  const stats = await getAdminDashboardStatsPg();

  return json({
    closuresThisWeek: stats.closuresThisWeek,
    openRequests: stats.openRequests,
    practitionersCount: stats.practitionersCount,
    recentRequests: stats.recentRequests.map((r) => ({
      id: r.id,
      subject: r.subject,
      category: formatRequestCategory(r.subject),
      status: r.status,
      created_at: r.created_at,
      patientName: r.patientName,
      creatorName: r.creatorName,
    })),
    upcomingClosures: stats.upcomingClosures.map((c) => ({
      id: c.id,
      start_date: c.start_date,
      end_date: c.end_date,
      note: c.note,
      full_name: c.full_name,
    })),
  });
}
