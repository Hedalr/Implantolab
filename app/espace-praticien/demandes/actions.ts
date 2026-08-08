"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isPostgresBackend } from "@/lib/db/backend";
import { getSql } from "@/lib/db/client";
import { notifyAfterRequestCreated } from "@/lib/api/v1/notify";
import {
  detectPhotoMimeType,
  extensionForPhotoMimeType,
  sanitizeDownloadFilename,
} from "@/lib/requests/media-security";
import { sectorExistsPg } from "@/lib/requests/pg";
import { REQUEST_MEDIA_BUCKET } from "@/lib/requests/request-media-access";
import { putObject } from "@/lib/storage/local";
import { getServiceRoleSupabase } from "@/lib/supabase/admin";
import {
  getServerSupabase,
  requirePractitioner,
} from "@/lib/supabase/server";
import { isRequestCategory } from "@/lib/requests/types";
import { isUuid } from "@/lib/api/v1/ids";
import {
  consumeRateLimit,
  MAX_REQUEST_PHOTOS,
  RATE_LIMITS,
} from "@/lib/api/v1/rate-limit";

const DEMANDES_PATH = "/espace-praticien/demandes";

const MAX_PHOTOS = MAX_REQUEST_PHOTOS;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

function fail(reason: string): never {
  redirect(`${DEMANDES_PATH}?error=${reason}`);
}

export async function createRequest(formData: FormData): Promise<void> {
  // Parité API POST /api/v1/requests — praticien only.
  const { userId } = await requirePractitioner();

  const rate = consumeRateLimit(
    "requestCreateAction",
    userId,
    RATE_LIMITS.requestCreateAction,
  );
  if (rate.limited) fail("rate-limit");

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

  if (isPostgresBackend()) {
    if (!isUuid(sectorId) || !(await sectorExistsPg(sectorId))) {
      fail("sector");
    }

    const sql = getSql();
    let requestId: string;
    try {
      const rows = await sql<{ id: string }[]>`
        insert into public.requests (
          profile_id, sector_id, subject, message, patient_name, created_by, status
        )
        values (
          ${userId}::uuid,
          ${sectorId}::uuid,
          ${subject},
          ${message},
          ${patientName},
          ${userId}::uuid,
          'open'
        )
        returning id::text
      `;
      requestId = rows[0]?.id ?? "";
      if (!requestId) fail("save");
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      if (messageText.includes("REQUEST_RATE_LIMIT")) {
        fail("rate-limit");
      }
      fail("save");
    }

    await Promise.all(
      preparedPhotos.map(async (photo) => {
        const path = `requests/${requestId}/${randomUUID()}.${photo.extension}`;
        try {
          await putObject(REQUEST_MEDIA_BUCKET, path, photo.buffer);
          await sql`
            insert into public.request_media (
              request_id, storage_bucket, storage_path, mime_type, size_bytes, original_filename
            )
            values (
              ${requestId}::uuid,
              ${REQUEST_MEDIA_BUCKET},
              ${path},
              ${photo.mimeType},
              ${photo.size},
              ${photo.originalFilename}
            )
          `;
        } catch (err) {
          console.error("[demandes/createRequest] photo upload:", err);
        }
      }),
    );

    void notifyAfterRequestCreated(requestId).catch((err) => {
      console.error("[demandes/createRequest] notify:", err);
    });

    revalidatePath(DEMANDES_PATH);
    redirect(`${DEMANDES_PATH}?ok=sent`);
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
      profile_id: userId,
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
