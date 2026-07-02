"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

const DEMANDES_PATH = "/espace-praticien/demandes";

function fail(reason: string): never {
  redirect(`${DEMANDES_PATH}?error=${reason}`);
}

export async function createRequest(formData: FormData): Promise<void> {
  const { userId, profile } = await requireUser();

  if (!profile.practiceId) {
    fail("no-practice");
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (subject.length < 3 || subject.length > 140) {
    fail("subject");
  }

  if (message.length < 10 || message.length > 2000) {
    fail("message");
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("requests").insert({
    practice_id: profile.practiceId,
    subject,
    message,
    status: "open",
    created_by: userId,
  });

  if (error) {
    fail("save");
  }

  revalidatePath(DEMANDES_PATH);
  redirect(`${DEMANDES_PATH}?ok=sent`);
}
