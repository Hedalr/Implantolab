import "server-only";

import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import type { ExpoPushMessage, PushTokenRow } from "@/lib/push/types";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

/**
 * Envoie des messages Expo Push par lots de 100.
 * Best-effort : purge les tokens `DeviceNotRegistered`.
 */
export async function sendExpoPushMessages(
  messages: ExpoPushMessage[],
): Promise<void> {
  if (messages.length === 0) return;

  const invalidTokens: string[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error(
          `[push/expo] HTTP ${response.status} (${chunk.length} messages)`,
        );
        continue;
      }

      const json = (await response.json()) as { data?: ExpoTicket[] };
      const tickets = json.data ?? [];
      let errorCount = 0;
      for (let j = 0; j < tickets.length; j++) {
        const ticket = tickets[j];
        if (ticket.status !== "error") continue;
        errorCount += 1;
        const token = chunk[j]?.to;
        if (ticket.details?.error === "DeviceNotRegistered" && token) {
          invalidTokens.push(token);
        }
      }
      if (errorCount > 0) {
        console.warn(`[push/expo] ${errorCount} ticket(s) en erreur sur le lot`);
      }
    } catch (error) {
      console.error("[push/expo] échec réseau", error);
    }
  }

  if (invalidTokens.length > 0) {
    await deleteInvalidTokens(invalidTokens);
  }
}

async function deleteInvalidTokens(tokens: string[]): Promise<void> {
  if (!isServiceRoleConfigured()) return;
  const supabase = getServiceRoleSupabase();
  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .in("token", tokens);
  if (error) {
    console.error("[push/expo] purge tokens invalides", error.message);
  }
}

export function tokensToMessages(
  tokens: PushTokenRow[],
  content: { title: string; body: string; data?: ExpoPushMessage["data"] },
): ExpoPushMessage[] {
  const seen = new Set<string>();
  const messages: ExpoPushMessage[] = [];
  for (const row of tokens) {
    if (!row.token || seen.has(row.token)) continue;
    seen.add(row.token);
    messages.push({
      to: row.token,
      title: content.title,
      body: content.body,
      data: content.data,
      sound: "default",
    });
  }
  return messages;
}
