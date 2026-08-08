"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/api/v1/ids";
import {
  consumeRateLimit,
  RATE_LIMITS,
} from "@/lib/api/v1/rate-limit";
import { isPostgresBackend } from "@/lib/db/backend";
import {
  createLeaveRequestPg,
  deleteOwnLeaveRequestPg,
} from "@/lib/leave/pg";
import { getServerSupabase, requireLabCollaborator } from "@/lib/supabase/server";

const CONGES_PATH = "/espace-praticien/conges";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function go(params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(`${CONGES_PATH}?${query}`);
}

export async function addLeaveRequest(formData: FormData): Promise<void> {
  const { userId } = await requireLabCollaborator();

  const rate = consumeRateLimit(
    "leaveCreate",
    userId,
    RATE_LIMITS.leaveCreate,
  );
  if (rate.limited) go({ error: "rate-limit" });

  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    go({ error: "validation" });
  }
  if (endDate < startDate) {
    go({ error: "order" });
  }
  if (note.length > 500) {
    go({ error: "note" });
  }

  if (isPostgresBackend()) {
    const result = await createLeaveRequestPg({
      profileId: userId,
      createdBy: userId,
      startDate,
      endDate,
      note: note.length > 0 ? note : null,
    });
    if (!result.ok) {
      if (result.error === "balance") {
        go({
          error: "balance",
          ...(result.detail ? { detail: result.detail } : {}),
        });
      }
      if (result.error === "conflict") go({ error: "conflict" });
      if (result.error === "profile") go({ error: "profile" });
      console.error("[addLeaveRequest] postgres:", result);
      go({ error: "save" });
    }
  } else {
    // days_count est également recalculé côté trigger DB, mais on doit fournir
    // une valeur valide (> 0) pour satisfaire la contrainte NOT NULL / > 0.
    const start = new Date(`${startDate}T00:00:00Z`).getTime();
    const end = new Date(`${endDate}T00:00:00Z`).getTime();
    const daysCount = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const supabase = await getServerSupabase();
    const { error } = await supabase.from("leave_requests").insert({
      profile_id: userId,
      start_date: startDate,
      end_date: endDate,
      days_count: daysCount,
      note: note.length > 0 ? note : null,
      created_by: userId,
    });

    if (error) {
      const message = error.message ?? "";
      if (message.startsWith("INSUFFICIENT_BALANCE")) {
        const detail = message.replace(/^INSUFFICIENT_BALANCE:\s*/, "");
        go({ error: "balance", detail });
      }
      if (message.startsWith("SECTOR_CONFLICT")) {
        go({ error: "conflict" });
      }
      if (message.startsWith("PROFILE_NOT_FOUND")) {
        go({ error: "profile" });
      }
      console.error("[addLeaveRequest] échec insert:", error);
      go({ error: "save" });
    }
  }

  revalidatePath(CONGES_PATH);
  revalidatePath("/espace-praticien/admin/conges");
  go({ ok: "added" });
}

export async function deleteLeaveRequest(formData: FormData): Promise<void> {
  const { userId } = await requireLabCollaborator();

  const id = String(formData.get("id") ?? "").trim();
  if (!id || (isPostgresBackend() && !isUuid(id))) {
    go({ error: "validation" });
  }

  if (isPostgresBackend()) {
    const result = await deleteOwnLeaveRequestPg({
      profileId: userId,
      leaveId: id,
    });
    if (!result.ok) {
      go({ error: "delete" });
    }
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", id)
      .eq("profile_id", userId)
      .in("status", ["pending", "rejected"]);

    if (error) {
      go({ error: "delete" });
    }
  }

  revalidatePath(CONGES_PATH);
  revalidatePath("/espace-praticien/admin/conges");
  go({ ok: "deleted" });
}
