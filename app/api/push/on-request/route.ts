import { NextResponse } from "next/server";

import { notifyNewInboxRequest } from "@/lib/push/notify";
import type { RequestPushRecord } from "@/lib/push/types";
import {
  assertPushWebhookAuth,
  parseSupabaseWebhook,
} from "@/lib/push/webhook-auth";

/**
 * Database Webhook Supabase — INSERT sur `requests`.
 * Notifie admins + chef de secteur pour Question / Urgence.
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

  await notifyNewInboxRequest({
    id: record.id,
    subject: record.subject,
    patient_name: record.patient_name ?? null,
    sector_id: record.sector_id ?? null,
  });

  return NextResponse.json({ ok: true });
}
