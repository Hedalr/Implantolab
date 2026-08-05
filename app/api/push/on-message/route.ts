import { NextResponse } from "next/server";

import { notifyRequestReply } from "@/lib/push/notify";
import type { MessagePushRecord } from "@/lib/push/types";
import {
  assertPushWebhookAuth,
  parseSupabaseWebhook,
} from "@/lib/push/webhook-auth";

/**
 * Database Webhook Supabase — INSERT sur `request_messages`.
 * Notifie le praticien propriétaire si l'expéditeur n'est pas lui.
 */
export async function POST(request: Request) {
  const authError = assertPushWebhookAuth(request);
  if (authError) return authError;

  const payload = await parseSupabaseWebhook<MessagePushRecord>(request);
  if (!payload || payload.type !== "INSERT" || !payload.record) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const record = payload.record;
  if (!record.request_id || !record.sender_id || !record.body) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await notifyRequestReply({
    request_id: record.request_id,
    sender_id: record.sender_id,
    body: record.body,
  });

  return NextResponse.json({ ok: true });
}
