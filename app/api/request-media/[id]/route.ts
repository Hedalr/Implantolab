import { NextResponse, type NextRequest } from "next/server";
import { sanitizeDownloadFilename } from "@/lib/requests/media-security";
import {
  isMediaId,
  loadAccessibleMedia,
  signMediaUrl,
} from "@/lib/requests/request-media-access";
import { getServerSupabase, getSessionUser } from "@/lib/supabase/server";

/**
 * Redirige vers une signed URL du bucket privé `request-media`, pour
 * afficher ou télécharger les photos jointes à une demande praticien.
 *
 * Les policies RLS sur `request_media` / `storage.objects` vérifient déjà
 * que l'utilisateur a le droit de voir ce fichier.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isMediaId(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  // Vignettes : petit cache navigateur sous le TTL, pour éviter de re-signer
  // à chaque ouverture de lightbox sur la même page.
  response.headers.set(
    "Cache-Control",
    variant === "thumb" ? "private, max-age=30" : "private, no-store",
  );
  return response;
}
