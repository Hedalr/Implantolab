"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getServerSupabase,
  requireAdminOrChef,
} from "@/lib/supabase/server";
import { REQUEST_INBOX_SUBJECTS } from "@/lib/requests/types";
import { parseRequestStatusFilter } from "@/lib/requests/queries";

function pickStatusRedirect(status: FormDataEntryValue | null): string {
  const safe = parseRequestStatusFilter(
    typeof status === "string" ? status : undefined,
  );
  return `/espace-praticien/admin/demandes?status=${safe}`;
}

async function updateRequestStatus(
  formData: FormData,
  status: "open" | "closed",
): Promise<void> {
  const { profile } = await requireAdminOrChef();
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Identifiant de demande manquant.");
  }

  const supabase = await getServerSupabase();
  let update = supabase.from("requests").update({ status }).eq("id", id);

  if (profile.role === "chef_de_secteur") {
    if (!profile.sectorId) {
      throw new Error("Secteur manquant pour ce chef de secteur.");
    }
    update = update
      .eq("sector_id", profile.sectorId)
      .in("subject", [...REQUEST_INBOX_SUBJECTS]);
  }

  const { data, error } = await update.select("id").maybeSingle();

  if (error || !data) {
    throw new Error(
      error
        ? `Impossible de mettre à jour la demande : ${error.message}`
        : "Demande introuvable ou hors périmètre.",
    );
  }

  revalidatePath("/espace-praticien/admin/demandes");
  revalidatePath("/espace-praticien/admin");
  revalidatePath("/espace-praticien/laboratoire");
  redirect(pickStatusRedirect(formData.get("status")));
}

export async function markRequestClosed(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "closed");
}

export async function markRequestOpen(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "open");
}
