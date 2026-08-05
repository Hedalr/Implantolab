import "server-only";

import { assertBearerSecret } from "@/lib/api/assert-bearer-secret";

export function assertPushWebhookAuth(request: Request): Response | null {
  return assertBearerSecret(request, "PUSH_WEBHOOK_SECRET");
}

export type SupabaseWebhookPayload<T extends Record<string, unknown>> = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: T | null;
  old_record: T | null;
};

export async function parseSupabaseWebhook<T extends Record<string, unknown>>(
  request: Request,
): Promise<SupabaseWebhookPayload<T> | null> {
  try {
    const json = (await request.json()) as SupabaseWebhookPayload<T>;
    if (!json || typeof json !== "object") return null;
    return json;
  } catch {
    return null;
  }
}
