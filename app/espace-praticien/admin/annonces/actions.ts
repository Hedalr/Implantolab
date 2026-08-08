"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  createAnnouncementPg,
  deleteAnnouncementPg,
} from "@/lib/announcements/pg";
import { isUuid } from "@/lib/api/v1/ids";
import {
  consumeRateLimit,
  RATE_LIMITS,
} from "@/lib/api/v1/rate-limit";
import { isPostgresBackend } from "@/lib/db/backend";
import { notifyAdminAnnouncement } from "@/lib/push/notify";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";

const ANNONCES_PATH = "/espace-praticien/admin/annonces";

function go(params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(`${ANNONCES_PATH}?${query}`);
}

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Parse `datetime-local` (sans fuseau) en Date locale. */
function parseExpiresAt(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function createAnnouncement(formData: FormData): Promise<void> {
  const { profile } = await requireAdmin();

  const rate = consumeRateLimit(
    "announcementCreate",
    profile.id,
    RATE_LIMITS.announcementCreate,
  );
  if (rate.limited) go({ error: "rate-limit" });

  const title = readText(formData, "title");
  const body = readText(formData, "body");
  const expiresRaw = readText(formData, "expires_at");

  if (title.length < 1 || title.length > 120) {
    go({ error: "title-validation" });
  }
  if (body.length < 1 || body.length > 2000) {
    go({ error: "body-validation" });
  }

  const expiresAt = parseExpiresAt(expiresRaw);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    go({ error: "expires-validation" });
  }

  if (isPostgresBackend()) {
    const result = await createAnnouncementPg({
      title,
      body,
      expiresAt,
      createdBy: profile.id,
    });
    if (!result.ok) {
      go({
        error:
          result.error === "title"
            ? "title-validation"
            : result.error === "body"
              ? "body-validation"
              : result.error === "expires"
                ? "expires-validation"
                : "save-failed",
      });
    }
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("admin_announcements").insert({
      title,
      body,
      created_by: profile.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("[admin/annonces] insert", error.message);
      go({ error: "save-failed" });
    }
  }

  // Push best-effort : ne doit pas retarder la redirection (fan-out Expo).
  after(() => notifyAdminAnnouncement({ title, body }));

  revalidatePath(ANNONCES_PATH);
  go({ ok: "created" });
}

export async function deleteAnnouncement(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = readText(formData, "id");
  if (!id || (isPostgresBackend() && !isUuid(id))) {
    go({ error: "delete-validation" });
  }

  if (isPostgresBackend()) {
    const result = await deleteAnnouncementPg(id);
    if (!result.ok) {
      go({
        error: result.error === "not_found" ? "delete-validation" : "delete-failed",
      });
    }
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from("admin_announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[admin/annonces] delete", error.message);
      go({ error: "delete-failed" });
    }
  }

  revalidatePath(ANNONCES_PATH);
  go({ ok: "deleted" });
}
