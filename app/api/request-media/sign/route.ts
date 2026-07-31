import { NextResponse, type NextRequest } from "next/server";
import {
  isMediaId,
  loadAccessibleMedia,
  signMediaUrl,
} from "@/lib/requests/request-media-access";
import { getServerSupabase, getSessionUser } from "@/lib/supabase/server";

/**
 * Signe en une seule invocation les URLs de plusieurs photos, pour éviter
 * N × (auth + SELECT + sign) quand une galerie charge ses vignettes.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IDS = 48;

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const rawIds = (body as { ids?: unknown }).ids;
  const variantRaw = (body as { variant?: unknown }).variant;
  const variant = variantRaw === "thumb" ? "thumb" : "full";

  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }

  const ids = rawIds
    .filter((id): id is string => typeof id === "string" && isMediaId(id))
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const rows = await loadAccessibleMedia(supabase, ids);

  const urls: Record<string, string> = {};
  await Promise.all(
    rows.map(async (row) => {
      const signed = await signMediaUrl(supabase, row.storage_path, { variant });
      if (signed) urls[row.id] = signed;
    }),
  );

  return NextResponse.json(
    { urls },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
