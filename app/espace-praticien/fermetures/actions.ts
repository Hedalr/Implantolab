"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

const FERMETURES_PATH = "/espace-praticien/fermetures";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function fail(reason: string): never {
  redirect(`${FERMETURES_PATH}?error=${reason}`);
}

export async function addClosurePeriod(formData: FormData): Promise<void> {
  const { userId, profile } = await requireUser();

  if (!profile.practiceId) {
    fail("no-practice");
  }

  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    fail("validation");
  }

  if (endDate < startDate) {
    fail("order");
  }

  if (note.length > 500) {
    fail("note");
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("closure_periods").insert({
    practice_id: profile.practiceId,
    start_date: startDate,
    end_date: endDate,
    note: note.length > 0 ? note : null,
    created_by: userId,
  });

  if (error) {
    fail("save");
  }

  revalidatePath(FERMETURES_PATH);
  redirect(`${FERMETURES_PATH}?ok=added`);
}

export async function deleteClosurePeriod(formData: FormData): Promise<void> {
  const { profile } = await requireUser();

  if (!profile.practiceId) {
    fail("no-practice");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    fail("validation");
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("closure_periods")
    .delete()
    .eq("id", id)
    .eq("practice_id", profile.practiceId);

  if (error) {
    fail("delete");
  }

  revalidatePath(FERMETURES_PATH);
  redirect(`${FERMETURES_PATH}?ok=deleted`);
}
