/**
 * Remplace les webhooks pg_net Supabase : notifications déclenchées
 * depuis le code applicatif après insert (mode postgres).
 */
import { getSql } from "@/lib/db/client";
import { notifyProtheseModificationFromRequest } from "@/lib/email/prothese-notification";
import {
  notifyNewInboxRequest,
  notifyRequestReply,
} from "@/lib/push/notify";

export async function notifyAfterRequestCreated(
  requestId: string,
): Promise<void> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      subject: string;
      message: string;
      patient_name: string | null;
      sector_id: string | null;
      profile_id: string;
      created_by: string | null;
      created_at: Date;
      practitioner_name: string | null;
      practitioner_email: string | null;
    }[]
  >`
    select r.id::text,
           r.subject,
           r.message,
           r.patient_name,
           r.sector_id::text,
           r.profile_id::text,
           r.created_by::text,
           r.created_at,
           p.full_name as practitioner_name,
           u.email as practitioner_email
      from public.requests r
      join public.profiles p on p.id = r.profile_id
      join public.users u on u.id = r.profile_id
     where r.id = ${requestId}::uuid
     limit 1
  `;
  const request = rows[0];
  if (!request) return;

  await notifyNewInboxRequest({
    id: request.id,
    subject: request.subject,
    patient_name: request.patient_name,
    sector_id: request.sector_id,
    profile_id: request.profile_id,
  });

  await notifyProtheseModificationFromRequest({
    id: request.id,
    subject: request.subject,
    message: request.message,
    patient_name: request.patient_name,
    sector_id: request.sector_id,
    profile_id: request.profile_id,
    created_by: request.created_by,
    created_at:
      request.created_at instanceof Date
        ? request.created_at.toISOString()
        : String(request.created_at),
    practitioner_name: request.practitioner_name,
    practitioner_email: request.practitioner_email,
  });
}

export async function notifyAfterMessageCreated(
  requestId: string,
  messageId: string,
): Promise<void> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      request_id: string;
      sender_id: string;
      body: string;
    }[]
  >`
    select id::text, request_id::text, sender_id::text, body
      from public.request_messages
     where id = ${messageId}::uuid
       and request_id = ${requestId}::uuid
     limit 1
  `;
  const message = rows[0];
  if (!message) return;

  await notifyRequestReply({
    id: message.id,
    request_id: message.request_id,
    sender_id: message.sender_id,
    body: message.body,
  });
}
