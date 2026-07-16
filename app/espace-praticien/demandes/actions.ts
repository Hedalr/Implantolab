"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { isRequestCategory } from "@/lib/requests/types";

const DEMANDES_PATH = "/espace-praticien/demandes";
const REQUEST_MEDIA_BUCKET = "request-media";

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

function fail(reason: string): never {
  redirect(`${DEMANDES_PATH}?error=${reason}`);
}

function extensionFromFilename(name: string): string {
  const ext = name.split(".").pop();
  return ext && ext.length > 0 && ext.length <= 5 ? ext.toLowerCase() : "jpg";
}

export async function createRequest(formData: FormData): Promise<void> {
  const { userId, profile } = await requireUser();

  if (!profile.practiceId) {
    fail("no-practice");
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const sectorId = String(formData.get("sector_id") ?? "").trim();

  if (!isRequestCategory(subject)) {
    fail("subject");
  }

  if (!sectorId) {
    fail("sector");
  }

  if (message.length < 10 || message.length > 2000) {
    fail("message");
  }

  const photos = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (photos.length > MAX_PHOTOS) {
    fail("too-many-photos");
  }

  for (const photo of photos) {
    if (photo.size > MAX_PHOTO_SIZE_BYTES) {
      fail("photo-size");
    }
    if (photo.type && !ACCEPTED_PHOTO_TYPES.includes(photo.type)) {
      fail("photo-type");
    }
  }

  const supabase = await getServerSupabase();

  const { data: sectorRow, error: sectorError } = await supabase
    .from("sectors")
    .select("id")
    .eq("id", sectorId)
    .maybeSingle();

  if (sectorError || !sectorRow) {
    fail("sector");
  }

  const { data: inserted, error } = await supabase
    .from("requests")
    .insert({
      practice_id: profile.practiceId,
      subject,
      message,
      status: "open",
      created_by: userId,
      sector_id: sectorId,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    fail("save");
  }

  const requestId = inserted.id as string;

  // Upload best-effort : une photo qui échoue ne doit pas faire échouer
  // l'envoi de la demande (le texte est déjà enregistré à ce stade).
  for (const photo of photos) {
    const path = `requests/${requestId}/${randomUUID()}.${extensionFromFilename(photo.name)}`;
    const buffer = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(REQUEST_MEDIA_BUCKET)
      .upload(path, buffer, {
        contentType: photo.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) continue;

    await supabase.from("request_media").insert({
      request_id: requestId,
      storage_bucket: REQUEST_MEDIA_BUCKET,
      storage_path: path,
      mime_type: photo.type || null,
      size_bytes: photo.size,
      original_filename: photo.name || null,
    });
  }

  revalidatePath(DEMANDES_PATH);
  redirect(`${DEMANDES_PATH}?ok=sent`);
}
