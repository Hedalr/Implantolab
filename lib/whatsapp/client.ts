/**
 * Client minimaliste pour l'API Graph de Meta (WhatsApp Cloud API).
 *
 * Volontairement en `fetch` natif — pas de SDK Meta officiel Node.js et pas
 * envie d'ajouter une dépendance pour trois endpoints.
 *
 * Endpoints utilisés :
 *  - GET  /{MEDIA_ID}        → URL de téléchargement temporaire (~5 min).
 *  - GET  <media_url>        → binaire du média (avec Bearer token).
 *  - POST /{PHONE_ID}/messages → envoi d'un message texte (auto-reply).
 *
 * Docs : https://developers.facebook.com/docs/whatsapp/cloud-api/reference
 */

const DEFAULT_API_VERSION = "v21.0";

function apiVersion(): string {
  return process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION;
}

function accessToken(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN manquant : impossible d'appeler la Graph API WhatsApp.",
    );
  }
  return token;
}

/** Récupère l'URL temporaire de téléchargement d'un média à partir de son id. */
async function fetchMediaUrl(mediaId: string): Promise<{
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
} | null> {
  const res = await fetch(
    `https://graph.facebook.com/${apiVersion()}/${encodeURIComponent(mediaId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken()}` },
      cache: "no-store",
    },
  );

  if (!res.ok) return null;

  const data = (await res.json()) as {
    url?: string;
    mime_type?: string;
    file_size?: number;
    sha256?: string;
  };

  if (!data.url) return null;

  return {
    url: data.url,
    mimeType: data.mime_type ?? null,
    sizeBytes: typeof data.file_size === "number" ? data.file_size : null,
    sha256: data.sha256 ?? null,
  };
}

/**
 * Télécharge un média WhatsApp à partir de son id.
 *
 * Two-step : (1) récupération de l'URL signée via `/MEDIA_ID`,
 * (2) téléchargement du binaire avec le Bearer token (obligatoire).
 *
 * @returns le binaire + les métadonnées, ou `null` si le média n'existe pas
 *          ou si l'URL a expiré côté Meta.
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{
  data: Buffer;
  mimeType: string | null;
  sizeBytes: number;
  sha256: string | null;
} | null> {
  const meta = await fetchMediaUrl(mediaId);
  if (!meta) return null;

  const res = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${accessToken()}` },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    data: buffer,
    mimeType: meta.mimeType ?? res.headers.get("content-type"),
    sizeBytes: buffer.byteLength,
    sha256: meta.sha256,
  };
}

/** Envoie un message texte à un numéro WhatsApp (accusé de réception au dentiste). */
export async function sendWhatsAppText(params: {
  toPhoneE164: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneId) {
    return { ok: false, error: "WHATSAPP_PHONE_NUMBER_ID manquant" };
  }

  const to = params.toPhoneE164.replace(/^\+/, "");

  const res = await fetch(
    `https://graph.facebook.com/${apiVersion()}/${encodeURIComponent(phoneId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: params.body, preview_url: false },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Meta ${res.status}: ${text.slice(0, 300)}` };
  }
  return { ok: true };
}
