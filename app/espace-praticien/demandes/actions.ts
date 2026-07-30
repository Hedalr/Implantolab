"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  detectPhotoMimeType,
  extensionForPhotoMimeType,
  sanitizeDownloadFilename,
} from "@/lib/requests/media-security";
import { getServiceRoleSupabase } from "@/lib/supabase/admin";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import {
  isRequestCategory,
  MODIFICATION_PROTHESE_CATEGORY,
} from "@/lib/requests/types";
import { sendProtheseModificationNotification } from "@/lib/email/prothese-notification";

const DEMANDES_PATH = "/espace-praticien/demandes";
const REQUEST_MEDIA_BUCKET = "request-media";

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

function fail(reason: string): never {
  redirect(`${DEMANDES_PATH}?error=${reason}`);
}

export async function createRequest(formData: FormData): Promise<void> {
  const { userId, profile } = await requireUser();

  if (!profile.practiceId) {
    fail("no-practice");
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const patientName = String(formData.get("patient_name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const sectorId = String(formData.get("sector_id") ?? "").trim();

  if (!isRequestCategory(subject)) {
    fail("subject");
  }

  if (!sectorId) {
    fail("sector");
  }

  if (patientName.length < 2 || patientName.length > 120) {
    fail("patient");
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

  const preparedPhotos = [];
  for (const photo of photos) {
    if (photo.size > MAX_PHOTO_SIZE_BYTES) {
      fail("photo-size");
    }

    const buffer = Buffer.from(await photo.arrayBuffer());
    const mimeType = detectPhotoMimeType(buffer);
    if (!mimeType) {
      fail("photo-type");
    }

    const extension = extensionForPhotoMimeType(mimeType);
    preparedPhotos.push({
      buffer,
      extension,
      mimeType,
      originalFilename: sanitizeDownloadFilename(
        photo.name,
        `photo.${extension}`,
      ),
      size: photo.size,
    });
  }

  const supabase = await getServerSupabase();
  let storageAdmin: ReturnType<typeof getServiceRoleSupabase> | null = null;
  if (preparedPhotos.length > 0) {
    try {
      storageAdmin = getServiceRoleSupabase();
    } catch {
      fail("media-config");
    }
  }

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
      patient_name: patientName,
      message,
      status: "open",
      created_by: userId,
      sector_id: sectorId,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    if (error?.message.includes("REQUEST_RATE_LIMIT")) {
      fail("rate-limit");
    }
    fail("save");
  }

  const requestId = inserted.id as string;

  // Effets de bord best-effort (notification email, upload photos) : la
  // demande est déjà enregistrée à ce stade, ils ne doivent jamais la faire
  // échouer. La notification est différée via `after()` pour ne pas
  // ralentir la redirection avec l'appel réseau vers Resend.
  if (subject === MODIFICATION_PROTHESE_CATEGORY) {
    after(() =>
      sendProtheseModificationNotification({
        requestId,
        practiceName: profile.practiceName,
        patientName,
        practitionerName: profile.fullName,
        practitionerEmail: profile.email,
        message,
        createdAt: new Date(),
      }),
    );
  }

  for (const photo of preparedPhotos) {
    if (!storageAdmin) continue;
    const path = `requests/${requestId}/${randomUUID()}.${photo.extension}`;

    const { error: uploadError } = await storageAdmin.storage
      .from(REQUEST_MEDIA_BUCKET)
      .upload(path, photo.buffer, {
        contentType: photo.mimeType,
        upsert: false,
      });

    if (uploadError) continue;

    await supabase.from("request_media").insert({
      request_id: requestId,
      storage_bucket: REQUEST_MEDIA_BUCKET,
      storage_path: path,
      mime_type: photo.mimeType,
      size_bytes: photo.size,
      original_filename: photo.originalFilename,
    });
  }

  revalidatePath(DEMANDES_PATH);
  redirect(`${DEMANDES_PATH}?ok=sent`);
}
