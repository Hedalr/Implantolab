import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

/**
 * Redirige vers une signed URL du bucket privé `request-media` valable
 * ~5 minutes, pour afficher les photos jointes à une demande praticien.
 *
 * Contrairement à /api/case-media (écritures service_role depuis le webhook
 * WhatsApp), ici tout se fait avec le client authentifié : les policies RLS
 * sur `storage.objects` vérifient déjà que l'utilisateur a le droit de voir
 * ce fichier (son propre cabinet, ou un admin).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SEC = 300;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await requireUser();

  const supabase = await getServerSupabase();
  const { data: media, error } = await supabase
    .from("request_media")
    .select("id, storage_bucket, storage_path, original_filename")
    .eq("id", id)
    .maybeSingle();

  if (error || !media) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(media.storage_bucket as string)
    .createSignedUrl(media.storage_path as string, SIGNED_URL_TTL_SEC, {
      download: request.nextUrl.searchParams.get("download") === "1"
        ? (media.original_filename as string | null) ?? undefined
        : undefined,
    });

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "signing_failed", detail: signErr?.message },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
