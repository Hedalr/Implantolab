"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createClosurePeriodPg,
  deleteOwnClosurePeriodPg,
} from "@/lib/closures/pg";
import { isUuid } from "@/lib/api/v1/ids";
import {
  consumeRateLimit,
  RATE_LIMITS,
} from "@/lib/api/v1/rate-limit";
import { isPostgresBackend } from "@/lib/db/backend";
import {
  getServerSupabase,
  requirePractitioner,
} from "@/lib/supabase/server";

const FERMETURES_PATH = "/espace-praticien/fermetures";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function fail(reason: string): never {
  redirect(`${FERMETURES_PATH}?error=${reason}`);
}

export async function addClosurePeriod(formData: FormData): Promise<void> {
  // Parité API POST /api/v1/closure-periods — praticien only.
  const { userId } = await requirePractitioner();

  const rate = consumeRateLimit(
    "closureCreate",
    userId,
    RATE_LIMITS.closureCreate,
  );
  if (rate.limited) fail("rate-limit");

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

  if (isPostgresBackend()) {
    const result = await createClosurePeriodPg({
      profileId: userId,
      createdBy: userId,
      startDate,
      endDate,
      note: note.length > 0 ? note : null,
    });
    if (!result.ok) {
      fail(result.error === "save" ? "save" : result.error);
    }
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("closure_periods").insert({
      profile_id: userId,
      start_date: startDate,
      end_date: endDate,
      note: note.length > 0 ? note : null,
      created_by: userId,
    });

    if (error) {
      fail("save");
    }
  }

  revalidatePath(FERMETURES_PATH);
  revalidatePath("/espace-praticien/admin/calendrier");
  redirect(`${FERMETURES_PATH}?ok=added`);
}

export async function deleteClosurePeriod(formData: FormData): Promise<void> {
  const { userId } = await requirePractitioner();

  const id = String(formData.get("id") ?? "").trim();
  if (!id || (isPostgresBackend() && !isUuid(id))) {
    fail("validation");
  }

  if (isPostgresBackend()) {
    const result = await deleteOwnClosurePeriodPg({
      profileId: userId,
      closureId: id,
    });
    if (!result.ok) {
      fail("delete");
    }
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from("closure_periods")
      .delete()
      .eq("id", id)
      .eq("profile_id", userId);

    if (error) {
      fail("delete");
    }
  }

  revalidatePath(FERMETURES_PATH);
  revalidatePath("/espace-praticien/admin/calendrier");
  redirect(`${FERMETURES_PATH}?ok=deleted`);
}
