import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vérifie la signature HMAC-SHA256 d'un payload webhook WhatsApp.
 *
 * Meta signe chaque webhook avec le secret d'application (`APP_SECRET`) et
 * fournit la signature dans l'entête `x-hub-signature-256` sous la forme
 * `sha256=<hex>`. Cette fonction recalcule le HMAC et compare en
 * temps constant.
 *
 * @param rawBody Corps brut de la requête HTTP (bytes reçus).
 * @param signatureHeader Valeur de l'entête `x-hub-signature-256`.
 * @param appSecret Secret d'application Meta.
 * @returns `true` si la signature est valide.
 */
export function verifyWhatsAppSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;

  const [scheme, signature] = signatureHeader.split("=");
  if (scheme !== "sha256" || !signature) return false;

  const body =
    typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
  const expected = createHmac("sha256", appSecret).update(body).digest("hex");

  if (expected.length !== signature.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}
