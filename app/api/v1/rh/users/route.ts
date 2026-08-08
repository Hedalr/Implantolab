import { NextRequest } from "next/server";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { isUuid } from "@/lib/api/v1/ids";
import { isPostgresBackend } from "@/lib/db/backend";
import { sendInviteEmail } from "@/lib/email/invite";
import {
  inviteUserPg,
  listLabEmployeesPg,
  listPractitionersPg,
} from "@/lib/rh/pg";
import { getSiteUrl } from "@/lib/supabase/admin";

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

  const scope = request.nextUrl.searchParams.get("scope") ?? "practitioners";
  const users =
    scope === "lab"
      ? await listLabEmployeesPg()
      : await listPractitionersPg();

  return json({ users });
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

  let body: {
    email?: string;
    fullName?: string;
    role?: string;
    sectorId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const rawSector =
    body.sectorId === null || body.sectorId === undefined || body.sectorId === ""
      ? null
      : String(body.sectorId);
  if (rawSector && !isUuid(rawSector)) {
    return json({ error: "invite-sector" }, { status: 400 });
  }

  const result = await inviteUserPg({
    email: String(body.email ?? ""),
    fullName: body.fullName,
    role: body.role,
    sectorId: rawSector,
    siteUrl: getSiteUrl(),
  });

  if (!result.ok) {
    const status =
      result.error === "invite-validation" ||
      result.error === "invite-sector" ||
      result.error === "invite-exists" ||
      result.error === "invite-exists-deleted"
        ? 400
        : 500;
    return json({ error: result.error }, { status });
  }
  if (!result.data) {
    return json({ error: "invite-failed" }, { status: 500 });
  }

  const emailResult = await sendInviteEmail({
    to: result.data.email,
    inviteUrl: result.data.inviteUrl,
    kind: "invite",
    fullName: body.fullName,
  });

  // Jamais renvoyer inviteToken / inviteUrl au client (token en clair).
  return json(
    {
      id: result.data.userId,
      email: result.data.email,
      role: result.data.role,
      expiresAt: result.data.expiresAt,
      emailSent: emailResult.sent,
    },
    { status: 201 },
  );
}
