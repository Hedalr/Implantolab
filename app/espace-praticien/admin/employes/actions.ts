"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { SECTOR_LAB_ROLES } from "@/lib/roles";
import { EQUIPE_PATH, parseEquipeTab, type EquipeTab } from "@/lib/equipe";

const CONGES_PATH = "/espace-praticien/admin/conges";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function go(params: Record<string, string>, tab: EquipeTab = "membres"): never {
  const query = new URLSearchParams(params);
  if (tab !== "membres") {
    query.set("tab", tab);
  }
  redirect(`${EQUIPE_PATH}?${query.toString()}`);
}

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function tabFromForm(formData: FormData, fallback: EquipeTab): EquipeTab {
  return parseEquipeTab(readText(formData, "return_tab") || fallback);
}

export async function createSector(formData: FormData): Promise<void> {
  await requireAdmin();
  const tab = tabFromForm(formData, "secteurs");

  const name = readText(formData, "name");
  const color = readText(formData, "color") || "#94a3b8";

  if (name.length < 2 || name.length > 80) {
    go({ error: "sector-name" }, tab);
  }
  if (!HEX_COLOR.test(color)) {
    go({ error: "sector-color" }, tab);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("sectors").insert({ name, color });

  if (error) {
    if (error.code === "23505") {
      go({ error: "sector-duplicate" }, tab);
    }
    go({ error: "sector-save" }, tab);
  }

  revalidatePath(EQUIPE_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "sector-created" }, tab);
}

export async function updateSector(formData: FormData): Promise<void> {
  await requireAdmin();
  const tab = tabFromForm(formData, "secteurs");

  const id = readText(formData, "id");
  const name = readText(formData, "name");
  const color = readText(formData, "color");

  if (!id) {
    go({ error: "sector-validation" }, tab);
  }
  if (name.length < 2 || name.length > 80) {
    go({ error: "sector-name" }, tab);
  }
  if (!HEX_COLOR.test(color)) {
    go({ error: "sector-color" }, tab);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("sectors")
    .update({ name, color })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      go({ error: "sector-duplicate" }, tab);
    }
    go({ error: "sector-save" }, tab);
  }

  revalidatePath(EQUIPE_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "sector-updated" }, tab);
}

export async function deleteSector(formData: FormData): Promise<void> {
  await requireAdmin();
  const tab = tabFromForm(formData, "secteurs");

  const id = readText(formData, "id");
  if (!id) {
    go({ error: "sector-validation" }, tab);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("sectors").delete().eq("id", id);

  if (error) {
    go({ error: "sector-delete" }, tab);
  }

  revalidatePath(EQUIPE_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "sector-deleted" }, tab);
}

export async function updateEmployeeSector(formData: FormData): Promise<void> {
  await requireAdmin();
  const tab = tabFromForm(formData, "membres");

  const profileId = readText(formData, "profile_id");
  const rawSectorId = readText(formData, "sector_id");
  const sectorId = rawSectorId.length > 0 ? rawSectorId : null;

  if (!profileId) {
    go({ error: "employee-validation" }, tab);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ sector_id: sectorId })
    .eq("id", profileId)
    .in("role", [...SECTOR_LAB_ROLES]);

  if (error) {
    go({ error: "employee-save" }, tab);
  }

  revalidatePath(EQUIPE_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "employee-sector" }, tab);
}

export async function updateEmployeeLeaveBalance(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const tab = tabFromForm(formData, "membres");

  const profileId = readText(formData, "profile_id");
  const rawBalance = readText(formData, "leave_balance_days");
  const balance = Number.parseInt(rawBalance, 10);

  if (!profileId) {
    go({ error: "employee-validation" }, tab);
  }
  if (!Number.isFinite(balance) || balance < 0 || balance > 365) {
    go({ error: "employee-balance-invalid" }, tab);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ leave_balance_days: balance })
    .eq("id", profileId)
    .in("role", [...SECTOR_LAB_ROLES]);

  if (error) {
    go({ error: "employee-save" }, tab);
  }

  revalidatePath(EQUIPE_PATH);
  revalidatePath(CONGES_PATH);
  go({ ok: "employee-balance" }, tab);
}
