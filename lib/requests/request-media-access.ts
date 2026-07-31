import type { SupabaseClient } from "@supabase/supabase-js";

export const REQUEST_MEDIA_BUCKET = "request-media";

/** TTL court : l'URL n'a besoin de vivre que le temps du chargement. */
export const SIGNED_URL_TTL_SEC = 60;

/** Vignette 64×64 CSS ; 160 px source pour rester net sur écrans retina. */
export const THUMB_TRANSFORM = {
  width: 160,
  height: 160,
  resize: "cover" as const,
  quality: 70,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMediaId(value: string): boolean {
  return UUID_RE.test(value);
}

export function isExpectedStoragePath(
  requestId: string,
  storagePath: string,
): boolean {
  return (
    storagePath.startsWith(`requests/${requestId}/`) &&
    !storagePath.includes("\\") &&
    !storagePath.split("/").includes("..")
  );
}

export type RequestMediaRow = {
  id: string;
  request_id: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string | null;
};

export async function loadAccessibleMedia(
  supabase: SupabaseClient,
  ids: string[],
): Promise<RequestMediaRow[]> {
  const unique = [...new Set(ids.filter(isMediaId))];
  if (unique.length === 0) return [];

  const { data, error } = await supabase
    .from("request_media")
    .select("id, request_id, storage_bucket, storage_path, original_filename")
    .in("id", unique);

  if (error || !data) return [];

  return (data as RequestMediaRow[]).filter(
    (row) =>
      row.storage_bucket === REQUEST_MEDIA_BUCKET &&
      isExpectedStoragePath(row.request_id, row.storage_path),
  );
}

export async function signMediaUrl(
  supabase: SupabaseClient,
  storagePath: string,
  options: {
    variant?: "thumb" | "full";
    download?: string;
  } = {},
): Promise<string | null> {
  const variant = options.variant ?? "full";

  if (variant === "thumb") {
    const { data, error } = await supabase.storage
      .from(REQUEST_MEDIA_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC, {
        transform: THUMB_TRANSFORM,
      });
    if (!error && data?.signedUrl) return data.signedUrl;
    // Image Transformation peut être désactivé sur le projet : repli pleine taille.
  }

  const { data, error } = await supabase.storage
    .from(REQUEST_MEDIA_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC, {
      download: options.download,
    });

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
