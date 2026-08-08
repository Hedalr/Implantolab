import { NextResponse, type NextRequest } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import { getSql } from "@/lib/db/client";
import { canAccessRequest } from "@/lib/api/v1/access";
import { isUuid } from "@/lib/api/v1/ids";
import {
  mediaContentHeaders,
  sanitizeDownloadFilename,
} from "@/lib/requests/media-security";
import {
  isMediaId,
  isReadableLocalMedia,
  loadAccessibleMedia,
  signMediaUrl,
} from "@/lib/requests/request-media-access";
import { getObject } from "@/lib/storage/local";
import {
  getCurrentProfile,
  getServerSupabase,
  getSessionUser,
} from "@/lib/supabase/server";

/**
 * Sert les photos jointes à une demande :
 * - supabase : redirect signed URL Storage
 * - postgres : bytes locaux (`.data/storage`)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  // Anti-enum : forme invalide → 403 (pas de 404 distinct).
  if (!isUuid(id) || !isMediaId(id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (isPostgresBackend()) {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!isReadableLocalMedia(media)) {
      return NextResponse.json({ error: "missing_file" }, { status: 404 });
    }

    const bytes = await getObject(media.storage_bucket, media.storage_path);
    if (!bytes) {
      return NextResponse.json({ error: "missing_file" }, { status: 404 });
    }

    const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(bytes), {
      headers: mediaContentHeaders({
        mimeType: media.mime_type,
        filename: media.original_filename,
        download: wantsDownload,
      }),
    });
  }

  const supabase = await getServerSupabase();
  const [media] = await loadAccessibleMedia(supabase, [id]);
  if (!media) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  const variant =
    !wantsDownload && request.nextUrl.searchParams.get("variant") === "thumb"
      ? "thumb"
      : "full";

  const signedUrl = await signMediaUrl(supabase, media.storage_path, {
    variant,
    download: wantsDownload
      ? sanitizeDownloadFilename(media.original_filename, "photo")
      : undefined,
  });

  if (!signedUrl) {
    console.error("[request-media] échec signature");
    return NextResponse.json({ error: "signing_failed" }, { status: 500 });
  }

  const response = NextResponse.redirect(signedUrl, { status: 302 });
  response.headers.set(
    "Cache-Control",
    variant === "thumb" ? "private, max-age=30" : "private, no-store",
  );
  return response;
}
