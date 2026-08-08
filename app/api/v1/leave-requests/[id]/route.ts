import { NextRequest } from "next/server";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { isUuid } from "@/lib/api/v1/ids";
import { isPostgresBackend } from "@/lib/db/backend";
import {
  deleteLeaveRequestAsAdminPg,
  deleteOwnLeaveRequestPg,
  reviewLeaveRequestPg,
} from "@/lib/leave/pg";
import { isSectorLabRole } from "@/lib/roles";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;
  if (!id || !isUuid(id)) {
    return json({ error: "validation" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const status = String(body.status ?? "").trim();
  if (status !== "approved" && status !== "rejected") {
    return json({ error: "validation" }, { status: 400 });
  }

  const result = await reviewLeaveRequestPg({
    leaveId: id,
    reviewerId: user.id,
    status,
  });

  if (!result.ok) {
    const httpStatus =
      result.error === "not_found"
        ? 404
        : result.error === "balance" || result.error === "conflict"
          ? 409
          : 500;
    return json(
      { error: result.error, detail: result.detail ?? null },
      { status: httpStatus },
    );
  }

  return json({ id: result.id, status });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;

  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  const { id } = await context.params;
  if (!id || !isUuid(id)) {
    return json({ error: "validation" }, { status: 400 });
  }

  if (profile.role === "admin") {
    const result = await deleteLeaveRequestAsAdminPg(id);
    if (!result.ok) {
      return json({ error: result.error }, { status: 404 });
    }
    return json({ id: result.id, deleted: true });
  }

  if (!isSectorLabRole(profile.role)) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const result = await deleteOwnLeaveRequestPg({
    profileId: profile.id,
    leaveId: id,
  });
  if (!result.ok) {
    return json({ error: result.error }, { status: 404 });
  }
  return json({ id: result.id, deleted: true });
}
