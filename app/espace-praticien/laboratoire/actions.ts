"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, requireLaboStaff } from "@/lib/supabase/server";

function labRedirect(params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(`/espace-praticien/laboratoire?${query}`);
}

async function updateRequestStatus(
  formData: FormData,
  status: "open" | "closed",
): Promise<void> {
  await requireLaboStaff();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    labRedirect({ error: "missing" });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    redirect(
      `/espace-praticien/laboratoire/${id}?error=${encodeURIComponent(error.message.slice(0, 60))}`,
    );
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
