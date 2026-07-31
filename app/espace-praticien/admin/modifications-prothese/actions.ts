"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { MODIFICATION_PROTHESE_CATEGORY } from "@/lib/requests/types";
import { parseRequestStatusFilter } from "@/lib/requests/queries";

async function updateRequestStatus(
  formData: FormData,
  status: "open" | "closed",
): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Identifiant de demande manquant.");
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", id)
    .eq("subject", MODIFICATION_PROTHESE_CATEGORY)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      error
        ? `Impossible de mettre à jour la demande : ${error.message}`
        : "Demande introuvable ou hors périmètre.",
    );
  }

  revalidatePath("/espace-praticien/admin/modifications-prothese");
  revalidatePath("/espace-praticien/admin");

  const rawStatus = formData.get("status");
  const safeStatus = parseRequestStatusFilter(
    typeof rawStatus === "string" ? rawStatus : undefined,
  );
  redirect(
    `/espace-praticien/admin/modifications-prothese?status=${safeStatus}`,
  );
}

export async function markRequestClosed(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "closed");
}

export async function markRequestOpen(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "open");
}
