import { NextRequest } from "next/server";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { isUuid } from "@/lib/api/v1/ids";
import {
  deleteClosurePeriodAsAdminPg,
  deleteOwnClosurePeriodPg,
} from "@/lib/closures/pg";
import { isPostgresBackend } from "@/lib/db/backend";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;

  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  // P2-7 / S12 : praticien own-only ; admin any (parité RLS supabase).
  if (profile.role !== "practitioner" && profile.role !== "admin") {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id || !isUuid(id)) {
    return json({ error: "validation" }, { status: 400 });
  }

  const result =
    profile.role === "admin"
      ? await deleteClosurePeriodAsAdminPg(id)
      : await deleteOwnClosurePeriodPg({
          profileId: profile.id,
          closureId: id,
        });
  if (!result.ok) {
    return json({ error: result.error }, { status: 404 });
  }
  return json({ id: result.id, deleted: true });
}
