import "server-only";

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
 * Envoi via webhook DB (`/api/prothese/on-request`) à l'INSERT `requests`
 * (web + app mobile).
 */
const DEFAULT_NOTIFICATION_EMAIL = "modif-prothese@outlook.fr";

/**
 * Expéditeur des emails transactionnels du site. Nécessite un domaine
 * vérifié dans Resend (voir https://resend.com/domains). Peut être
 * surchargé via `RESEND_FROM_EMAIL`.
 */
const DEFAULT_FROM_EMAIL = "Implantolab <onboarding@resend.dev>";

export type ProtheseModificationNotification = {
  requestId: string;
  patientName: string;
  practitionerName: string | null;
  practitionerEmail: string;
  message: string;
  createdAt: Date;
};

/**
 * Corps texte brut pour la règle Outlook « l'imprimer » (étiquette labo).
 * Format provisoire : à caler sur une étiquette réelle côté client.
 */
export function buildProtheseModificationEmailText(
  notification: ProtheseModificationNotification,
): string {
  const praticien =
    notification.practitionerName?.trim() ||
    notification.practitionerEmail.trim() ||
    "—";

  return [
    "MODIFICATION PROTHESE",
    "",
    `Patient : ${notification.patientName}`,
    `Praticien : ${praticien}`,
    "",
    notification.message,
    "",
    `Reçu le ${formatDateTime(notification.createdAt)}`,
  ].join("\n");
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
      subject: `Modification prothèse — ${notification.patientName}`,
      text: buildProtheseModificationEmailText(notification),
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
  let practitionerName: string | null = null;
  let practitionerEmail = "";

  if (profileId && isServiceRoleConfigured()) {
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
