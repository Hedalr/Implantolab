export type AcceptedPhotoMimeType =
  | "image/heic"
  | "image/heif"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx"]);
const HEIF_BRANDS = new Set(["heif", "heim", "heis", "mif1", "msf1"]);

function hasBytes(bytes: Uint8Array, expected: number[], offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

export function detectPhotoMimeType(
  bytes: Uint8Array,
): AcceptedPhotoMimeType | null {
  if (hasBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    readAscii(bytes, 0, 4) === "RIFF" &&
    readAscii(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }
  if (readAscii(bytes, 4, 4) === "ftyp") {
    for (let offset = 8; offset + 4 <= Math.min(bytes.length, 40); offset += 4) {
      const brand = readAscii(bytes, offset, 4);
      if (HEIC_BRANDS.has(brand)) return "image/heic";
      if (HEIF_BRANDS.has(brand)) return "image/heif";
    }
  }
  return null;
}

export function extensionForPhotoMimeType(
  mimeType: AcceptedPhotoMimeType,
): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
  }
}

export function sanitizeDownloadFilename(
  filename: string | null | undefined,
  fallback = "photo",
): string {
  const safeName = (filename ?? "")
    .replace(/[\u0000-\u001f\u007f"\\/]/g, "_")
    .trim()
    .slice(0, 180);

  return safeName || fallback;
}

/** Headers communs download/inline — nosniff + disposition sanitisée. */
export function mediaContentHeaders(options: {
  mimeType: string | null | undefined;
  filename?: string | null;
  download?: boolean;
}): Record<string, string> {
  const filename = sanitizeDownloadFilename(options.filename, "photo");
  const disposition = options.download
    ? `attachment; filename="${filename}"`
    : `inline; filename="${filename}"`;
  return {
    "Content-Type": options.mimeType ?? "application/octet-stream",
    "Content-Disposition": disposition,
    "Cache-Control": "private, max-age=60",
    "X-Content-Type-Options": "nosniff",
  };
}
