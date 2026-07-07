import { createHash } from "node:crypto";
import { getServiceRoleSupabase } from "@/lib/supabase/admin";
import { downloadWhatsAppMedia } from "@/lib/whatsapp/client";
import { extractCaseFromText } from "@/lib/ai/extractCase";
import { notifySlackNewCase } from "@/lib/notifications/slack";
import { normalizePhoneE164 } from "@/lib/labo/phone";
import type {
  CaseExtraction,
  CasePriority,
  PatientCase,
} from "@/lib/labo/types";

/**
 * Cœur de l'ingestion WhatsApp → dossier patient.
 *
 * Ce module est utilisé par :
 *   - /api/whatsapp/webhook (POST) — payload Meta réel.
 *   - /api/whatsapp/mock (POST)    — payload simulé pour développement.
 *
 * Il utilise la clé service_role car il tourne dans un webhook non
 * authentifié (Meta ne s'authentifie pas via Supabase). Les writes bypassent
 * donc RLS ; la sécurité est assurée par la vérification de signature
 * HMAC-SHA256 avant appel.
 */

/** Fenêtre temporelle (ms) pour regrouper plusieurs messages dans le même dossier. */
const GROUPING_WINDOW_MS = 30 * 60 * 1000;

const CASE_MEDIA_BUCKET = "case-media";

export type IngestMediaInput = {
  whatsappMediaId?: string | null;
  mimeType?: string | null;
  buffer?: Buffer | null;
  filename?: string | null;
  caption?: string | null;
};

export type IngestMessageInput = {
  whatsappMessageId: string | null;
  from: string;
  timestamp: string | null;
  text?: string | null;
  caption?: string | null;
  media?: IngestMediaInput[];
  rawPayload?: unknown;
};

export type IngestResult = {
  caseId: string;
  caseNumber: string;
  isNewCase: boolean;
  mediaIngested: number;
};

// ---------------------------------------------------------------------------
// Snake_case ↔ camelCase adapters pour la table patient_cases
// ---------------------------------------------------------------------------

type PatientCaseRow = {
  id: string;
  case_number: string;
  patient_name: string | null;
  patient_name_confidence: number | null;
  dentist_contact_id: string | null;
  dentist_name_raw: string | null;
  dentist_phone_e164: string | null;
  work_type: string | null;
  description: string | null;
  status: PatientCase["status"];
  priority: CasePriority;
  assigned_prosthetist_id: string | null;
  needs_review: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToCase(row: PatientCaseRow): PatientCase {
  return {
    id: row.id,
    caseNumber: row.case_number,
    patientName: row.patient_name,
    patientNameConfidence: row.patient_name_confidence,
    dentistContactId: row.dentist_contact_id,
    dentistNameRaw: row.dentist_name_raw,
    dentistPhoneE164: row.dentist_phone_e164,
    workType: row.work_type,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedProsthetistId: row.assigned_prosthetist_id,
    needsReview: row.needs_review,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Contact dentiste (répertoire)
// ---------------------------------------------------------------------------

async function upsertDentistContact(params: {
  phoneE164: string;
  fullName?: string | null;
}): Promise<string | null> {
  const supabase = getServiceRoleSupabase();

  const { data: existing } = await supabase
    .from("dentist_contacts")
    .select("id, full_name")
    .eq("whatsapp_phone_e164", params.phoneE164)
    .maybeSingle();

  if (existing) {
    if (params.fullName && !existing.full_name) {
      await supabase
        .from("dentist_contacts")
        .update({ full_name: params.fullName })
        .eq("id", existing.id);
    }
    return existing.id as string;
  }

  const { data: inserted } = await supabase
    .from("dentist_contacts")
    .insert({
      whatsapp_phone_e164: params.phoneE164,
      full_name: params.fullName ?? null,
    })
    .select("id")
    .single();

  return (inserted?.id as string) ?? null;
}

// ---------------------------------------------------------------------------
// Regroupement : trouver un dossier ouvert récent pour ce numéro
// ---------------------------------------------------------------------------

async function findActiveCaseForPhone(
  phoneE164: string,
): Promise<PatientCaseRow | null> {
  const supabase = getServiceRoleSupabase();
  const cutoff = new Date(Date.now() - GROUPING_WINDOW_MS).toISOString();

  const { data } = await supabase
    .from("patient_cases")
    .select("*")
    .eq("dentist_phone_e164", phoneE164)
    .in("status", ["pending_review", "received", "waiting_info"])
    .gte("last_message_at", cutoff)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as PatientCaseRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Storage upload
// ---------------------------------------------------------------------------

function extensionFromMime(mimeType: string | null | undefined): string {
  if (!mimeType) return "bin";
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/amr": "amr",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
  };
  return map[mimeType.toLowerCase()] ?? "bin";
}

async function uploadMediaBuffer(params: {
  caseId: string;
  buffer: Buffer;
  mimeType: string | null;
  filename: string | null;
}): Promise<{ path: string; sha256: string } | null> {
  const supabase = getServiceRoleSupabase();
  const sha256 = createHash("sha256").update(params.buffer).digest("hex");
  const ext =
    params.filename?.split(".").pop()?.toLowerCase() ||
    extensionFromMime(params.mimeType);
  const path = `cases/${params.caseId}/${sha256.slice(0, 12)}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(CASE_MEDIA_BUCKET)
    .upload(path, params.buffer, {
      contentType: params.mimeType ?? "application/octet-stream",
      upsert: false,
    });

  if (error) return null;
  return { path, sha256 };
}

// ---------------------------------------------------------------------------
// Ingestion principale
// ---------------------------------------------------------------------------

/**
 * Ingère un message WhatsApp entrant : téléchargement des médias, extraction
 * IA, création ou mise à jour du dossier patient, notification Slack.
 *
 * @param input Message normalisé (extrait du payload Meta ou d'un mock).
 * @returns Le dossier créé/mis à jour + nombre de médias ingérés.
 */
export async function ingestMessage(
  input: IngestMessageInput,
): Promise<IngestResult> {
  const supabase = getServiceRoleSupabase();

  const senderPhone = normalizePhoneE164(input.from);
  if (!senderPhone) {
    throw new Error(`Numéro d'expéditeur invalide : ${input.from}`);
  }

  const receivedAt = input.timestamp
    ? new Date(Number(input.timestamp) * 1000 || input.timestamp).toISOString()
    : new Date().toISOString();

  const textBits: string[] = [];
  if (input.text) textBits.push(input.text);
  if (input.caption) textBits.push(input.caption);
  for (const m of input.media ?? []) {
    if (m.caption) textBits.push(m.caption);
  }
  const aggregatedText = textBits.join("\n").trim();

  // 1. Extraction IA (si clé configurée), sinon extraction vide.
  const extraction: CaseExtraction | null = aggregatedText
    ? await extractCaseFromText(aggregatedText)
    : null;

  // 2. Regroupement : dossier ouvert récent pour ce numéro ?
  const existingCase = await findActiveCaseForPhone(senderPhone);

  const dentistContactId = await upsertDentistContact({
    phoneE164: senderPhone,
    fullName: extraction?.dentistName ?? null,
  });

  let caseRow: PatientCaseRow;
  let isNewCase = false;

  if (existingCase) {
    // On enrichit le dossier existant sans écraser les infos déjà présentes.
    const patch: Partial<PatientCaseRow> = {
      last_message_at: receivedAt,
    };
    if (!existingCase.patient_name && extraction?.patientName) {
      patch.patient_name = extraction.patientName;
      patch.patient_name_confidence = extraction.patientNameConfidence;
    }
    if (!existingCase.dentist_name_raw && extraction?.dentistName) {
      patch.dentist_name_raw = extraction.dentistName;
    }
    if (!existingCase.work_type && extraction?.workType) {
      patch.work_type = extraction.workType;
    }
    if (extraction?.description) {
      patch.description = existingCase.description
        ? `${existingCase.description}\n\n${extraction.description}`
        : extraction.description;
    }
    if (extraction?.priority && existingCase.priority === "normal") {
      patch.priority = extraction.priority;
    }
    if (!existingCase.dentist_contact_id && dentistContactId) {
      patch.dentist_contact_id = dentistContactId;
    }

    const { data: updated } = await supabase
      .from("patient_cases")
      .update(patch)
      .eq("id", existingCase.id)
      .select("*")
      .single();

    caseRow = (updated as PatientCaseRow) ?? existingCase;
  } else {
    isNewCase = true;
    const insertPayload: Partial<PatientCaseRow> & { dentist_phone_e164: string } = {
      dentist_phone_e164: senderPhone,
      dentist_contact_id: dentistContactId,
      dentist_name_raw: extraction?.dentistName ?? null,
      patient_name: extraction?.patientName ?? null,
      patient_name_confidence: extraction?.patientNameConfidence ?? null,
      work_type: extraction?.workType ?? null,
      description: extraction?.description ?? null,
      priority: extraction?.priority ?? "normal",
      status: "pending_review",
      needs_review:
        !extraction ||
        !extraction.patientName ||
        (extraction.patientNameConfidence ?? 0) < 0.7,
      last_message_at: receivedAt,
    };

    const { data: created, error: createErr } = await supabase
      .from("patient_cases")
      .insert(insertPayload)
      .select("*")
      .single();

    if (createErr || !created) {
      throw new Error(
        `Impossible de créer le dossier patient : ${createErr?.message ?? "insert vide"}`,
      );
    }
    caseRow = created as PatientCaseRow;
  }

  // 3. Insertion du message brut (idempotent via whatsappMessageId unique).
  let insertedMessageId: string | null = null;
  if (input.whatsappMessageId) {
    const { data: existingMsg } = await supabase
      .from("case_messages")
      .select("id")
      .eq("whatsapp_message_id", input.whatsappMessageId)
      .maybeSingle();

    if (existingMsg) {
      insertedMessageId = existingMsg.id as string;
    }
  }

  if (!insertedMessageId) {
    const { data: msg } = await supabase
      .from("case_messages")
      .insert({
        case_id: caseRow.id,
        whatsapp_message_id: input.whatsappMessageId,
        direction: "inbound",
        sender_phone_e164: senderPhone,
        body: aggregatedText || null,
        raw_payload: input.rawPayload ?? null,
        received_at: receivedAt,
      })
      .select("id")
      .single();
    insertedMessageId = (msg?.id as string) ?? null;
  }

  // 4. Téléchargement + upload des médias.
  let mediaIngested = 0;
  for (const media of input.media ?? []) {
    let buffer = media.buffer ?? null;
    let mimeType = media.mimeType ?? null;

    if (!buffer && media.whatsappMediaId) {
      const downloaded = await downloadWhatsAppMedia(media.whatsappMediaId).catch(
        () => null,
      );
      if (downloaded) {
        buffer = downloaded.data;
        mimeType = downloaded.mimeType ?? mimeType;
      }
    }

    if (!buffer) continue;

    const uploaded = await uploadMediaBuffer({
      caseId: caseRow.id,
      buffer,
      mimeType,
      filename: media.filename ?? null,
    });
    if (!uploaded) continue;

    await supabase.from("case_media").insert({
      case_id: caseRow.id,
      message_id: insertedMessageId,
      storage_bucket: CASE_MEDIA_BUCKET,
      storage_path: uploaded.path,
      mime_type: mimeType,
      size_bytes: buffer.byteLength,
      sha256: uploaded.sha256,
      whatsapp_media_id: media.whatsappMediaId ?? null,
      original_filename: media.filename ?? null,
      caption: media.caption ?? null,
    });
    mediaIngested += 1;
  }

  // 5. Notification Slack (fire and forget).
  await notifySlackNewCase({
    caseRow: rowToCase(caseRow),
    mediaCount: mediaIngested,
    isNewCase,
  });

  return {
    caseId: caseRow.id,
    caseNumber: caseRow.case_number,
    isNewCase,
    mediaIngested,
  };
}

/**
 * Parse un payload webhook Meta et en extrait un `IngestMessageInput` par
 * message reçu (un webhook peut en contenir plusieurs).
 */
export function extractMessagesFromMetaPayload(
  payload: unknown,
): IngestMessageInput[] {
  const results: IngestMessageInput[] = [];
  const root = payload as {
    entry?: {
      changes?: {
        value?: {
          messages?: WhatsAppMetaMessage[];
        };
      }[];
    }[];
  };

  for (const entry of root?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const msg of messages) {
        results.push(metaMessageToInput(msg, payload));
      }
    }
  }

  return results;
}

type WhatsAppMetaMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: {
    id?: string;
    mime_type?: string;
    filename?: string;
    caption?: string;
  };
  audio?: { id?: string; mime_type?: string; voice?: boolean };
  video?: { id?: string; mime_type?: string; caption?: string };
  sticker?: { id?: string; mime_type?: string };
};

function metaMessageToInput(
  msg: WhatsAppMetaMessage,
  raw: unknown,
): IngestMessageInput {
  const media: IngestMediaInput[] = [];
  let caption: string | undefined;

  switch (msg.type) {
    case "image":
      if (msg.image?.id) {
        media.push({
          whatsappMediaId: msg.image.id,
          mimeType: msg.image.mime_type ?? null,
          caption: msg.image.caption ?? null,
        });
        caption = msg.image.caption;
      }
      break;
    case "document":
      if (msg.document?.id) {
        media.push({
          whatsappMediaId: msg.document.id,
          mimeType: msg.document.mime_type ?? null,
          filename: msg.document.filename ?? null,
          caption: msg.document.caption ?? null,
        });
        caption = msg.document.caption;
      }
      break;
    case "video":
      if (msg.video?.id) {
        media.push({
          whatsappMediaId: msg.video.id,
          mimeType: msg.video.mime_type ?? null,
          caption: msg.video.caption ?? null,
        });
        caption = msg.video.caption;
      }
      break;
    case "audio":
      if (msg.audio?.id) {
        media.push({
          whatsappMediaId: msg.audio.id,
          mimeType: msg.audio.mime_type ?? null,
        });
      }
      break;
    case "sticker":
      if (msg.sticker?.id) {
        media.push({
          whatsappMediaId: msg.sticker.id,
          mimeType: msg.sticker.mime_type ?? null,
        });
      }
      break;
    default:
      break;
  }

  return {
    whatsappMessageId: msg.id,
    from: msg.from,
    timestamp: msg.timestamp ?? null,
    text: msg.text?.body ?? null,
    caption: caption ?? null,
    media,
    rawPayload: raw,
  };
}
