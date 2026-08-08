import { NextRequest } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import {
  json,
  loadProfile,
  profileToJson,
  requireApiUser,
} from "@/lib/api/v1/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;

  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  return json({ profile: profileToJson(profile) });
}
