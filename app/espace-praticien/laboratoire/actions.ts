"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/api/v1/ids";
import { isPostgresBackend } from "@/lib/db/backend";
import { updateLabRequestStatusPg } from "@/lib/requests/pg";
import {
  getServerSupabase,
  isSectorLabRole,
  requireLaboStaff,
} from "@/lib/supabase/server";

async function updateRequestStatus(
  formData: FormData,
  status: "open" | "closed",
): Promise<void> {
  const { profile } = await requireLaboStaff();

  const id = String(formData.get("id") ?? "").trim();
  if (!id || (isPostgresBackend() && !isUuid(id))) {
    redirect("/espace-praticien/laboratoire?error=missing");
  }
  if (isSectorLabRole(profile.role) && !profile.sectorId) {
    redirect("/espace-praticien/laboratoire?error=forbidden");
  }

  if (isPostgresBackend()) {
    const ok = await updateLabRequestStatusPg({
      requestId: id,
      status,
      scope: isSectorLabRole(profile.role)
        ? { sectorId: profile.sectorId as string }
        : "admin",
    });
    if (!ok) {
      redirect("/espace-praticien/laboratoire?error=forbidden");
    }
  } else {
    const supabase = await getServerSupabase();
    const update = supabase
      .from("requests")
      .update({ status })
      .eq("id", id);
    const scopedUpdate = isSectorLabRole(profile.role)
      ? update.eq("sector_id", profile.sectorId)
      : update;
    const { data, error } = await scopedUpdate.select("id").maybeSingle();

    if (error || !data) {
      redirect("/espace-praticien/laboratoire?error=forbidden");
    }
  }

  revalidatePath("/espace-praticien/laboratoire");
  revalidatePath(`/espace-praticien/laboratoire/${id}`);
  revalidatePath("/espace-praticien/admin/demandes");
  revalidatePath("/espace-praticien/admin");
  redirect(`/espace-praticien/laboratoire/${id}?ok=updated`);
}

export async function markLabRequestClosed(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "closed");
}

export async function markLabRequestOpen(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "open");
}
