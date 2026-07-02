"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";

function pickStatusRedirect(status: FormDataEntryValue | null): string {
  const value = typeof status === "string" ? status : "";
  const allowed = ["all", "open", "closed"] as const;
  const safe = (allowed as readonly string[]).includes(value) ? value : "open";
  return `/espace-praticien/admin/demandes?status=${safe}`;
}

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
  const { error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw new Error(`Impossible de mettre à jour la demande : ${error.message}`);
  }

  revalidatePath("/espace-praticien/admin/demandes");
  revalidatePath("/espace-praticien/admin");
  redirect(pickStatusRedirect(formData.get("status")));
}

export async function markRequestClosed(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "closed");
}

export async function markRequestOpen(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "open");
}
