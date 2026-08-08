import type { RequestMessage } from "@/lib/requests/types";

export type ApiMessageRow = {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender_name?: string | null;
};

export function mapApiMessage(row: ApiMessageRow): RequestMessage {
  return {
    id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id,
    senderName: row.sender_name ?? null,
    body: row.body,
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at).toISOString(),
  };
}

/** Messages UX selon status HTTP (P2-7 / S7) — sans exposer les codes bruts. */
function messageForHttpStatus(
  status: number,
  fallback: string,
): string {
  if (status === 401) return "Session expirée. Reconnectez-vous.";
  if (status === 403) return "Vous n’avez pas accès à cette action.";
  if (status === 429) return "Trop de requêtes. Réessayez dans un moment.";
  if (status >= 500) return "Erreur serveur. Réessayez plus tard.";
  return fallback;
}

export async function fetchMessagesViaApi(
  requestId: string,
  since?: string,
): Promise<{ messages: RequestMessage[]; ok: boolean }> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  try {
    const response = await fetch(`/api/v1/requests/${requestId}/messages${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return { messages: [], ok: false };
    const data = (await response.json()) as { messages?: ApiMessageRow[] };
    return {
      messages: (data.messages ?? []).map(mapApiMessage),
      ok: true,
    };
  } catch {
    return { messages: [], ok: false };
  }
}

export async function sendMessageViaApi(
  requestId: string,
  body: string,
): Promise<{ message: RequestMessage | null; error: string | null }> {
  try {
    const response = await fetch(`/api/v1/requests/${requestId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!response.ok) {
      return {
        message: null,
        error: messageForHttpStatus(
          response.status,
          "Impossible d’envoyer le message.",
        ),
      };
    }
    const row = (await response.json()) as ApiMessageRow;
    return { message: mapApiMessage(row), error: null };
  } catch {
    return { message: null, error: "Impossible d’envoyer le message." };
  }
}
