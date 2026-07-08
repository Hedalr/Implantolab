"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";

const CONGES_PATH = "/espace-praticien/admin/conges";

function go(params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(`${CONGES_PATH}?${query}`);
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

  revalidatePath(CONGES_PATH);
  revalidatePath("/espace-praticien/conges");
  go({ ok: "deleted" });
}
