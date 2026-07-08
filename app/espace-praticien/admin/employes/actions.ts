"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";

const EMPLOYES_PATH = "/espace-praticien/admin/employes";
const CONGES_PATH = "/espace-praticien/admin/conges";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function go(params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(`${EMPLOYES_PATH}?${query}`);
}

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createSector(formData: FormData): Promise<void> {
  await requireAdmin();

  const name = readText(formData, "name");
  const color = readText(formData, "color") || "#94a3b8";

  if (name.length < 2 || name.length > 80) {
    go({ error: "sector-name" });
  }
  if (!HEX_COLOR.test(color)) {
    go({ error: "sector-color" });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("sectors").insert({ name, color });

  if (error) {
    if (error.code === "23505") {
      go({ error: "sector-duplicate" });
    }
    go({ error: "sector-save" });
  }

  revalidatePath(EMPLOYES_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "sector-created" });
}

export async function updateSector(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = readText(formData, "id");
  const name = readText(formData, "name");
  const color = readText(formData, "color");

  if (!id) {
    go({ error: "sector-validation" });
  }
  if (name.length < 2 || name.length > 80) {
    go({ error: "sector-name" });
  }
  if (!HEX_COLOR.test(color)) {
    go({ error: "sector-color" });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("sectors")
    .update({ name, color })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      go({ error: "sector-duplicate" });
    }
    go({ error: "sector-save" });
  }

  revalidatePath(EMPLOYES_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "sector-updated" });
}

export async function deleteSector(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = readText(formData, "id");
  if (!id) {
    go({ error: "sector-validation" });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("sectors").delete().eq("id", id);

  if (error) {
    go({ error: "sector-delete" });
  }

  revalidatePath(EMPLOYES_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "sector-deleted" });
}

export async function updateEmployeeSector(formData: FormData): Promise<void> {
  await requireAdmin();

  const profileId = readText(formData, "profile_id");
  const rawSectorId = readText(formData, "sector_id");
  const sectorId = rawSectorId.length > 0 ? rawSectorId : null;

  if (!profileId) {
    go({ error: "employee-validation" });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ sector_id: sectorId })
    .eq("id", profileId)
    .eq("role", "prosthetist");

  if (error) {
    go({ error: "employee-save" });
  }

  revalidatePath(EMPLOYES_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "employee-sector" });
}

export async function updateEmployeeLeaveBalance(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const profileId = readText(formData, "profile_id");
  const rawBalance = readText(formData, "leave_balance_days");
  const balance = Number.parseInt(rawBalance, 10);

  if (!profileId) {
    go({ error: "employee-validation" });
  }
  if (!Number.isFinite(balance) || balance < 0 || balance > 365) {
    go({ error: "employee-balance-invalid" });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ leave_balance_days: balance })
    .eq("id", profileId)
    .eq("role", "prosthetist");

  if (error) {
    go({ error: "employee-save" });
  }

  revalidatePath(EMPLOYES_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "employee-balance" });
}
