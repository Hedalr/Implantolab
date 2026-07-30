import { NextResponse, type NextRequest } from "next/server";
import { sanitizeDownloadFilename } from "@/lib/requests/media-security";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

/**
 * Redirige vers une signed URL du bucket privé `request-media` valable
 * ~5 minutes, pour afficher les photos jointes à une demande praticien.
 *
 * Les policies RLS sur `storage.objects` vérifient déjà que l'utilisateur
 * a le droit de voir ce fichier (sa propre demande, un admin, ou un
 * prothésiste du secteur concerné).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SEC = 300;
const REQUEST_MEDIA_BUCKET = "request-media";

function isExpectedStoragePath(requestId: string, storagePath: string): boolean {
  return (
    storagePath.startsWith(`requests/${requestId}/`) &&
    !storagePath.includes("\\") &&
    !storagePath.split("/").includes("..")
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await requireUser();

  const supabase = await getServerSupabase();
  const { data: media, error } = await supabase
    .from("request_media")
    .select("id, request_id, storage_bucket, storage_path, original_filename")
    .eq("id", id)
    .maybeSingle();

  if (error || !media) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const requestId = media.request_id as string;
  const storagePath = media.storage_path as string;
  if (
    media.storage_bucket !== REQUEST_MEDIA_BUCKET ||
    !isExpectedStoragePath(requestId, storagePath)
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(REQUEST_MEDIA_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC, {
      download: request.nextUrl.searchParams.get("download") === "1"
        ? sanitizeDownloadFilename(
            media.original_filename as string | null,
            "photo",
          )
        : undefined,
    });

  if (signErr || !signed?.signedUrl) {
    console.error("[request-media] échec signature:", signErr?.message ?? "unknown");
    return NextResponse.json({ error: "signing_failed" }, { status: 500 });
  }

  const response = NextResponse.redirect(signed.signedUrl, { status: 302 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
