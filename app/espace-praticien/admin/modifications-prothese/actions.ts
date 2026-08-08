"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/api/v1/ids";
import { isPostgresBackend } from "@/lib/db/backend";
import { updateLabRequestStatusPg } from "@/lib/requests/pg";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { MODIFICATION_PROTHESE_CATEGORY } from "@/lib/requests/types";
import { parseRequestStatusFilter } from "@/lib/requests/queries";

function pickStatusRedirect(status: FormDataEntryValue | null): string {
  const safe = parseRequestStatusFilter(
    typeof status === "string" ? status : undefined,
  );
  return `/espace-praticien/admin/modifications-prothese?status=${safe}`;
}

async function updateRequestStatus(
  formData: FormData,
  status: "open" | "closed",
): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    (isPostgresBackend() && !isUuid(id))
  ) {
    throw new Error("Identifiant de demande manquant.");
  }

  if (isPostgresBackend()) {
    const ok = await updateLabRequestStatusPg({
      requestId: id,
      status,
      scope: "admin",
      subjects: [MODIFICATION_PROTHESE_CATEGORY],
    });
    if (!ok) {
      throw new Error("Demande introuvable ou hors périmètre.");
    }
  } else {
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
  }

  revalidatePath("/espace-praticien/admin/modifications-prothese");
  revalidatePath("/espace-praticien/admin");
  redirect(pickStatusRedirect(formData.get("status")));
}

export async function markRequestClosed(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "closed");
}

export async function markRequestOpen(formData: FormData): Promise<void> {
  await updateRequestStatus(formData, "open");
}
