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
import { mediaContentHeaders } from "@/lib/requests/media-security";
import { isReadableLocalMedia } from "@/lib/requests/request-media-access";
import { getObject } from "@/lib/storage/local";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  // Anti-enum : id invalide / inconnu / hors accès → 403 (pas de 404 distinct).
  if (!isUuid(id)) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const sql = getSql();
  const rows = await sql<
    {
      request_id: string;
      storage_bucket: string;
      storage_path: string;
      mime_type: string | null;
      original_filename: string | null;
    }[]
  >`
    select request_id::text,
           storage_bucket,
           storage_path,
           mime_type,
           original_filename
      from public.request_media
     where id = ${id}::uuid
     limit 1
  `;
  const media = rows[0];
  if (!media || !(await canAccessRequest(profile, media.request_id))) {
    return json({ error: "forbidden" }, { status: 403 });
  }
  if (!isReadableLocalMedia(media)) {
    return json({ error: "missing_file" }, { status: 404 });
  }

  const bytes = await getObject(media.storage_bucket, media.storage_path);
  if (!bytes) return json({ error: "missing_file" }, { status: 404 });

  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: mediaContentHeaders({
      mimeType: media.mime_type,
      filename: media.original_filename,
      download: wantsDownload,
    }),
  });
}
