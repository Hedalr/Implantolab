import { NextRequest } from "next/server";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { isPostgresBackend } from "@/lib/db/backend";
import { createSectorPg, listSectorsPg } from "@/lib/rh/pg";

export const runtime = "nodejs";

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

  const sectors = await listSectorsPg();
  return json({ sectors });
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

  let body: { name?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await createSectorPg({
    name: String(body.name ?? ""),
    color: String(body.color ?? "#94a3b8"),
  });

  if (!result.ok) {
    const status =
      result.error === "sector-name" ||
      result.error === "sector-color" ||
      result.error === "sector-duplicate" ||
      result.error === "validation"
        ? 400
        : 500;
    return json({ error: result.error }, { status });
  }

  return json({ id: result.data?.id }, { status: 201 });
}
