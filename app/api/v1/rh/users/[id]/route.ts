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
  permanentlyDeleteUserPg,
  reactivateUserPg,
  resendInviteUserPg,
  softDeleteUserPg,
  updateEmployeeLeaveBalancePg,
  updateEmployeeSectorPg,
} from "@/lib/rh/pg";
import { getSiteUrl } from "@/lib/supabase/admin";

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
    return json({ error: "delete-validation" }, { status: 400 });
  }

  let body: {
    action?: string;
    sectorId?: string | null;
    leaveBalanceDays?: number;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();

  if (action === "soft-delete") {
    const result = await softDeleteUserPg(id);
    if (!result.ok) {
      return json(
        { error: result.error },
        { status: result.error === "delete-validation" ? 400 : 500 },
      );
    }
    // Idempotent : déjà soft-deleted → 200 + alreadyDeleted:true (pas de 500).
    return json({
      ok: true,
      role: result.data?.role,
      alreadyDeleted: result.data?.alreadyDeleted === true,
    });
  }

  if (action === "reactivate") {
    const result = await reactivateUserPg({
      profileId: id,
      siteUrl: getSiteUrl(),
    });
    if (!result.ok) {
      return json(
        { error: result.error },
        {
          status:
            result.error === "delete-validation" ||
            result.error === "reactivate-failed"
              ? 400
              : 500,
        },
      );
    }
    if (!result.data) {
      return json({ error: "reactivate-failed" }, { status: 500 });
    }
    const emailResult = await sendInviteEmail({
      to: result.data.email,
      inviteUrl: result.data.inviteUrl,
      kind: "reactivate",
    });
    // Jamais renvoyer resetToken / inviteUrl au client (token en clair).
    return json({
      ok: true,
      role: result.data.role,
      expiresAt: result.data.expiresAt,
      emailSent: emailResult.sent,
    });
  }

  if (action === "resend-invite") {
    const result = await resendInviteUserPg({
      profileId: id,
      siteUrl: getSiteUrl(),
    });
    if (!result.ok) {
      const status =
        result.error === "invite-validation" ||
        result.error === "invite-not-pending"
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
    });
    // Jamais renvoyer inviteToken / inviteUrl au client (token en clair).
    return json({
      ok: true,
      id: result.data.userId,
      email: result.data.email,
      role: result.data.role,
      expiresAt: result.data.expiresAt,
      emailSent: emailResult.sent,
    });
  }

  if (action === "sector") {
    const sectorId =
      body.sectorId === null || body.sectorId === ""
        ? null
        : String(body.sectorId ?? "");
    if (sectorId && !isUuid(sectorId)) {
      return json({ error: "employee-validation" }, { status: 400 });
    }
    const result = await updateEmployeeSectorPg({
      profileId: id,
      sectorId,
    });
    if (!result.ok) {
      return json({ error: result.error }, { status: 400 });
    }
    return json({ ok: true });
  }

  if (action === "leave-balance") {
    const result = await updateEmployeeLeaveBalancePg({
      profileId: id,
      leaveBalanceDays: Number(body.leaveBalanceDays),
    });
    if (!result.ok) {
      return json({ error: result.error }, { status: 400 });
    }
    return json({ ok: true });
  }

  return json({ error: "validation" }, { status: 400 });
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
    return json({ error: "delete-validation" }, { status: 400 });
  }

  const result = await permanentlyDeleteUserPg(id);
  if (!result.ok) {
    return json(
      { error: result.error },
      { status: result.error === "delete-validation" ? 400 : 500 },
    );
  }
  return json({ ok: true, role: result.data?.role });
}
