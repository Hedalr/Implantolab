import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import { getSql } from "@/lib/db/client";
import {
  json,
  loadProfile,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { canAccessRequest } from "@/lib/api/v1/access";
import { isUuid } from "@/lib/api/v1/ids";
import {
  detectPhotoMimeType,
  extensionForPhotoMimeType,
  sanitizeDownloadFilename,
} from "@/lib/requests/media-security";
import { REQUEST_MEDIA_BUCKET } from "@/lib/requests/request-media-access";
import { putObject } from "@/lib/storage/local";
import { MAX_REQUEST_PHOTOS } from "@/lib/api/v1/rate-limit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });
  if (!isUuid(id) || !(await canAccessRequest(profile, id))) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const sql = getSql();
  // Ne pas exposer storage_bucket / storage_path au client (hygiène P2-4 / S8).
  const media = await sql`
    select id, request_id, mime_type, size_bytes, original_filename, created_at
      from public.request_media
     where request_id = ${id}::uuid
     order by created_at asc
  `;

  return json({
    media: media.map((row) => ({
      id: row.id,
      request_id: row.request_id,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      original_filename: row.original_filename,
      created_at: row.created_at,
      url: `/api/v1/media/${row.id}`,
    })),
  });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });
  if (profile.role !== "practitioner") {
    return json({ error: "forbidden" }, { status: 403 });
  }
  if (!isUuid(id)) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const sql = getSql();
  const ownerRows = await sql<{ id: string }[]>`
    select profile_id::text as id
      from public.requests
     where id = ${id}::uuid
     limit 1
  `;
  if (!ownerRows[0] || ownerRows[0].id !== profile.id) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const countRows = await sql<{ n: number }[]>`
    select count(*)::int as n
      from public.request_media
     where request_id = ${id}::uuid
  `;
  if ((countRows[0]?.n ?? 0) >= MAX_REQUEST_PHOTOS) {
    return json({ error: "too_many_photos" }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return json({ error: "file_too_large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_PHOTO_SIZE_BYTES) {
    return json({ error: "file_too_large" }, { status: 400 });
  }

  const mimeType = detectPhotoMimeType(buffer);
  if (!mimeType) {
    return json({ error: "invalid_mime" }, { status: 400 });
  }

  const ext = extensionForPhotoMimeType(mimeType);
  const storagePath = `requests/${id}/${randomUUID()}.${ext}`;
  await putObject(REQUEST_MEDIA_BUCKET, storagePath, buffer);

  const rows = await sql<{ id: string }[]>`
    insert into public.request_media (
      request_id, storage_bucket, storage_path, mime_type, size_bytes, original_filename
    )
    values (
      ${id}::uuid,
      ${REQUEST_MEDIA_BUCKET},
      ${storagePath},
      ${mimeType},
      ${buffer.byteLength},
      ${sanitizeDownloadFilename(file.name, `photo.${ext}`)}
    )
    returning id
  `;

  const mediaId = rows[0]?.id;
  return json(
    { id: mediaId, url: `/api/v1/media/${mediaId}` },
    { status: 201 },
  );
}
