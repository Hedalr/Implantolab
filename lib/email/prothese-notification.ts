import "server-only";

import { isPostgresBackend } from "@/lib/db/backend";
import { getSql } from "@/lib/db/client";
import { getResendClient, isResendConfigured } from "@/lib/email/resend";
import type { RequestPushRecord } from "@/lib/push/types";
import { MODIFICATION_PROTHESE_CATEGORY } from "@/lib/requests/types";
import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
  withAdminTimeout,
} from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils/date";

/**
 * Boîte mail dédiée aux demandes "Modifications prothèse". Chaque email
 * reçu y déclenche l'impression automatique d'une étiquette côté
 * laboratoire (règle Outlook + imprimante Brother QL-800 dédiée).
 * Peut être surchargée via `PROTHESE_REQUEST_NOTIFICATION_EMAIL`.
 *
 * Envoi via webhook DB (`/api/prothese/on-request`) en mode supabase,
 * ou `notifyAfterRequestCreated` en mode postgres.
 *
 * Format calé sur rouleau DK 62×29 mm : un corps trop long + les en-têtes
 * Outlook (De / À / Objet) produisent un job multipage → une étiquette
 * quasi vide par page (symptôme « impression en boucle »).
 */
const DEFAULT_NOTIFICATION_EMAIL = "modif-prothese@outlook.fr";

/**
 * Expéditeur des emails transactionnels du site. Nécessite un domaine
 * vérifié dans Resend (voir https://resend.com/domains). Peut être
 * surchargé via `RESEND_FROM_EMAIL`.
 */
const DEFAULT_FROM_EMAIL = "Implantolab <onboarding@resend.dev>";

/** Largeur utile typique d'une DK 62×29 mm en caractères monospace ~11–12 pt. */
const LABEL_LINE_MAX = 34;
const LABEL_MESSAGE_MAX = 90;

export type ProtheseModificationNotification = {
  requestId: string;
  patientName: string;
  practitionerName: string | null;
  practitionerEmail: string;
  message: string;
  createdAt: Date;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clipLabelLine(value: string, max = LABEL_LINE_MAX): string {
  const cleaned = collapseWhitespace(value);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * Corps texte brut pour la règle Outlook « l'imprimer » (étiquette labo).
 * Compact volontairement : 62×29 mm ≈ 4–5 lignes lisibles.
 */
export function buildProtheseModificationEmailText(
  notification: ProtheseModificationNotification,
): string {
  const praticien =
    notification.practitionerName?.trim() ||
    notification.practitionerEmail.trim() ||
    "—";
  const message = clipLabelLine(
    notification.message,
    LABEL_MESSAGE_MAX,
  );

  return [
    "MODIF PROTHESE",
    `P: ${clipLabelLine(notification.patientName)}`,
    `D: ${clipLabelLine(praticien)}`,
    message,
    formatDateTime(notification.createdAt),
  ].join("\n");
}

/**
 * Variante HTML (Outlook Word) : police large, pas de marges, pas de
 * mise en page longue. Les en-têtes De/À restent gérés côté style
 * d'impression Outlook — à désactiver sur le PC labo.
 */
export function buildProtheseModificationEmailHtml(
  notification: ProtheseModificationNotification,
): string {
  const praticien =
    notification.practitionerName?.trim() ||
    notification.practitionerEmail.trim() ||
    "—";
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const patient = escape(clipLabelLine(notification.patientName, 40));
  const dentist = escape(clipLabelLine(praticien, 40));
  const message = escape(
    clipLabelLine(notification.message, LABEL_MESSAGE_MAX),
  );
  const when = escape(formatDateTime(notification.createdAt));

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:2mm;font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.15;color:#000;">
<div style="font-weight:700;font-size:12pt;text-decoration:underline;">MODIF PROTHESE</div>
<div><b>P:</b> ${patient}</div>
<div><b>D:</b> ${dentist}</div>
<div>${message}</div>
<div style="font-size:9pt;">${when}</div>
</body>
</html>`;
}

/**
 * Best-effort Resend : logue les erreurs, ne les remonte pas.
 */
export async function sendProtheseModificationNotification(
  notification: ProtheseModificationNotification,
): Promise<void> {
  if (!isResendConfigured()) {
    console.warn(
      "[prothese-notification] RESEND_API_KEY absent : email non envoyé.",
    );
    return;
  }

  const to =
    process.env.PROTHESE_REQUEST_NOTIFICATION_EMAIL ??
    DEFAULT_NOTIFICATION_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL;

  if (from === DEFAULT_FROM_EMAIL) {
    console.warn(
      "[prothese-notification] RESEND_FROM_EMAIL absent : envoi depuis l'adresse sandbox " +
        "onboarding@resend.dev, qui ne peut livrer qu'à l'adresse du compte Resend " +
        `(destinataire visé : ${to}). Vérifier un domaine sur resend.com/domains pour la prod.`,
    );
  }

  try {
    const { error } = await getResendClient().emails.send({
      from,
      to,
      // Doit contenir "Modification prothèse" : la règle Outlook filtre sur l'objet.
      subject: `Modification prothèse — ${clipLabelLine(notification.patientName, 40)}`,
      text: buildProtheseModificationEmailText(notification),
      html: buildProtheseModificationEmailHtml(notification),
    });

    if (error) {
      console.error("[prothese-notification] Échec de l'envoi Resend :", error);
    }
  } catch (err) {
    console.error("[prothese-notification] Exception lors de l'envoi :", err);
  }
}

/**
 * Adapter webhook INSERT `requests` → email étiquette (web + mobile).
 */
export async function notifyProtheseModificationFromRequest(
  record: RequestPushRecord,
): Promise<void> {
  if (record.subject !== MODIFICATION_PROTHESE_CATEGORY) return;

  const message = record.message?.trim();
  const patientName = record.patient_name?.trim();
  if (!record.id || !message || !patientName) return;

  const profileId = record.profile_id ?? record.created_by ?? null;
  let practitionerName =
    typeof record.practitioner_name === "string"
      ? record.practitioner_name
      : null;
  let practitionerEmail =
    typeof record.practitioner_email === "string"
      ? record.practitioner_email
      : "";

  if (!practitionerName && !practitionerEmail && profileId) {
    if (isPostgresBackend()) {
      try {
        const sql = getSql();
        const rows = await sql<
          { full_name: string | null; email: string }[]
        >`
          select p.full_name, u.email
            from public.profiles p
            join public.users u on u.id = p.id
           where p.id = ${profileId}::uuid
           limit 1
        `;
        practitionerName = rows[0]?.full_name ?? null;
        practitionerEmail = rows[0]?.email ?? "";
      } catch (err) {
        console.warn(
          "[prothese-notification] profil praticien indisponible (postgres) :",
          err instanceof Error ? err.message : err,
        );
      }
    } else if (isServiceRoleConfigured()) {
      try {
        const admin = getServiceRoleSupabase();
        const [{ data: profile }, userResult] = await Promise.all([
          admin
            .from("profiles")
            .select("full_name")
            .eq("id", profileId)
            .maybeSingle(),
          withAdminTimeout(admin.auth.admin.getUserById(profileId), 4_000),
        ]);

        practitionerName = profile?.full_name ?? null;
        practitionerEmail = userResult.data.user?.email ?? "";
      } catch (err) {
        console.warn(
          "[prothese-notification] profil praticien indisponible :",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  const createdAt = new Date(record.created_at ?? Date.now());

  await sendProtheseModificationNotification({
    requestId: record.id,
    patientName,
    practitionerName,
    practitionerEmail,
    message,
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
  });
}
