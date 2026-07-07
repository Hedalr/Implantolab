import { NextResponse, type NextRequest } from "next/server";
import { requireUser, getServerSupabase } from "@/lib/supabase/server";
import { getServiceRoleSupabase } from "@/lib/supabase/admin";

/**
 * Redirige un utilisateur authentifié (admin ou prosthetist) vers une signed
 * URL du bucket privé `case-media` valable ~5 minutes.
 *
 * Le bucket est privé et les uploads sont faits via service_role depuis le
 * webhook. Pour servir les fichiers dans l'UI (galerie photos, aperçu PDF),
 * on génère une URL signée à la demande.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SEC = 300;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { profile } = await requireUser();

  if (profile.role !== "admin" && profile.role !== "prosthetist") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await getServerSupabase();
  const { data: media, error } = await supabase
    .from("case_media")
    .select("id, storage_bucket, storage_path, mime_type, original_filename")
    .eq("id", id)
    .maybeSingle();

  if (error || !media) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const service = getServiceRoleSupabase();
  const { data: signed, error: signErr } = await service.storage
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
