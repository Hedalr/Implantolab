import { NextResponse } from "next/server";

import { notifyProtheseModificationFromRequest } from "@/lib/email/prothese-notification";
import type { RequestPushRecord } from "@/lib/push/types";
import {
  assertPushWebhookAuth,
  parseSupabaseWebhook,
} from "@/lib/push/webhook-auth";

/**
 * Database Webhook Supabase — INSERT sur `requests` (Modifications prothèse).
 * Envoie l'email Resend qui déclenche l'impression d'étiquette (web + mobile).
 */
export async function POST(request: Request) {
  const authError = assertPushWebhookAuth(request);
  if (authError) return authError;

  const payload = await parseSupabaseWebhook<RequestPushRecord>(request);
  if (!payload || payload.type !== "INSERT" || !payload.record) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const record = payload.record;
  if (!record.id || !record.subject) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await notifyProtheseModificationFromRequest(record);

  return NextResponse.json({ ok: true });
}
