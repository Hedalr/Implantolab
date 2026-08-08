"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/api/v1/ids";
import { isPostgresBackend } from "@/lib/db/backend";
import {
  deleteLeaveRequestAsAdminPg,
  reviewLeaveRequestPg,
} from "@/lib/leave/pg";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { EQUIPE_PATH } from "@/lib/equipe";

const CONGES_PATH = "/espace-praticien/admin/conges";
const EMPLOYES_CONGES_PATH = `${EQUIPE_PATH}?tab=conges`;

const ALLOWED_RETURN_BASES = [CONGES_PATH, EMPLOYES_CONGES_PATH, EQUIPE_PATH];

function go(params: Record<string, string>, formData?: FormData): never {
  const raw = formData
    ? String(formData.get("return_path") ?? "").trim()
    : "";
  let base = CONGES_PATH;
  if (raw) {
    const pathOnly = raw.split("?")[0];
    if (
      ALLOWED_RETURN_BASES.some(
        (allowed) => allowed === raw || allowed === pathOnly,
      )
    ) {
      base =
        raw.includes("tab=")
          ? raw
          : raw === EQUIPE_PATH
            ? EMPLOYES_CONGES_PATH
            : raw;
    }
  }
  const [path, existingQuery = ""] = base.split("?");
  const query = new URLSearchParams(existingQuery);
  for (const [key, value] of Object.entries(params)) {
    query.set(key, value);
  }
  redirect(`${path}?${query.toString()}`);
}

function revalidateLeavePaths() {
  revalidatePath(CONGES_PATH);
  revalidatePath(EQUIPE_PATH);
  revalidatePath("/espace-praticien/conges");
}

export async function adminApproveLeaveRequest(
  formData: FormData,
): Promise<void> {
  const { userId } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id || (isPostgresBackend() && !isUuid(id))) {
    go({ error: "validation" }, formData);
  }

  if (isPostgresBackend()) {
    const result = await reviewLeaveRequestPg({
      leaveId: id,
      reviewerId: userId,
      status: "approved",
    });
    if (!result.ok) {
      if (result.error === "balance") go({ error: "balance" }, formData);
      if (result.error === "conflict") go({ error: "conflict" }, formData);
      console.error("[adminApproveLeaveRequest] postgres:", result);
      go({ error: "review" }, formData);
    }
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "approved",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending");

    if (error) {
      const message = error.message ?? "";
      if (message.startsWith("INSUFFICIENT_BALANCE")) {
        go({ error: "balance" }, formData);
      }
      if (message.startsWith("SECTOR_CONFLICT")) {
        go({ error: "conflict" }, formData);
      }
      console.error("[adminApproveLeaveRequest] échec:", error);
      go({ error: "review" }, formData);
    }
  }

  revalidateLeavePaths();
  go({ ok: "approved" }, formData);
}

export async function adminRejectLeaveRequest(
  formData: FormData,
): Promise<void> {
  const { userId } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id || (isPostgresBackend() && !isUuid(id))) {
    go({ error: "validation" }, formData);
  }

  if (isPostgresBackend()) {
    const result = await reviewLeaveRequestPg({
      leaveId: id,
      reviewerId: userId,
      status: "rejected",
    });
    if (!result.ok) {
      console.error("[adminRejectLeaveRequest] postgres:", result);
      go({ error: "review" }, formData);
    }
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "rejected",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending");

    if (error) {
      console.error("[adminRejectLeaveRequest] échec:", error);
      go({ error: "review" }, formData);
    }
  }

  revalidateLeavePaths();
  go({ ok: "rejected" }, formData);
}

export async function adminDeleteLeaveRequest(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id || (isPostgresBackend() && !isUuid(id))) {
    go({ error: "validation" }, formData);
  }

  if (isPostgresBackend()) {
    const result = await deleteLeaveRequestAsAdminPg(id);
    if (!result.ok) {
      go({ error: "delete" }, formData);
    }
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("leave_requests").delete().eq("id", id);

    if (error) {
      go({ error: "delete" }, formData);
    }
  }

  revalidateLeavePaths();
  go({ ok: "deleted" }, formData);
}
