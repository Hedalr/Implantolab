import { NextRequest } from "next/server";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { isUuid } from "@/lib/api/v1/ids";
import { isPostgresBackend } from "@/lib/db/backend";
import { deleteSectorPg, updateSectorPg } from "@/lib/rh/pg";

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
  if (!isUuid(id)) {
    return json({ error: "validation" }, { status: 400 });
  }

  let body: { name?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await updateSectorPg({
    id,
    name: String(body.name ?? ""),
    color: String(body.color ?? ""),
  });

  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "sector-name" ||
            result.error === "sector-color" ||
            result.error === "sector-duplicate" ||
            result.error === "validation"
          ? 400
          : 500;
    return json({ error: result.error }, { status });
  }

  return json({ ok: true });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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
  if (!isUuid(id)) {
    return json({ error: "validation" }, { status: 400 });
  }

  const result = await deleteSectorPg(id);
  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "validation"
          ? 400
          : 500;
    return json({ error: result.error }, { status });
  }

  return json({ ok: true });
}
