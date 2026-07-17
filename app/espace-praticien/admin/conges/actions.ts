"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";

const CONGES_PATH = "/espace-praticien/admin/conges";

function go(params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(`${CONGES_PATH}?${query}`);
}

function revalidateLeavePaths() {
  revalidatePath(CONGES_PATH);
  revalidatePath("/espace-praticien/conges");
}

export async function adminApproveLeaveRequest(
  formData: FormData,
): Promise<void> {
  const { userId } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    go({ error: "validation" });
  }

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
      go({ error: "balance" });
    }
    if (message.startsWith("SECTOR_CONFLICT")) {
      go({ error: "conflict" });
    }
    console.error("[adminApproveLeaveRequest] échec:", error);
    go({ error: "review" });
  }

  revalidateLeavePaths();
  go({ ok: "approved" });
}

export async function adminRejectLeaveRequest(
  formData: FormData,
): Promise<void> {
  const { userId } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    go({ error: "validation" });
  }

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
    go({ error: "review" });
  }

  revalidateLeavePaths();
  go({ ok: "rejected" });
}

export async function adminDeleteLeaveRequest(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    go({ error: "validation" });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("leave_requests").delete().eq("id", id);

  if (error) {
    go({ error: "delete" });
  }

  revalidateLeavePaths();
  go({ ok: "deleted" });
}
