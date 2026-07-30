import { getResendClient, isResendConfigured } from "@/lib/email/resend";
import { formatDateTime } from "@/lib/utils/date";

/**
 * Boîte mail dédiée aux demandes "Modifications prothèse". Chaque email
 * reçu y déclenche l'impression automatique d'une étiquette côté
 * laboratoire (règle Outlook + imprimante Brother QL-800 dédiée).
 * Peut être surchargée via `PROTHESE_REQUEST_NOTIFICATION_EMAIL`.
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
  practiceName: string | null;
  patientName: string;
  practitionerName: string | null;
  practitionerEmail: string;
  message: string;
  createdAt: Date;
};

/**
 * Construit le corps texte de l'email envoyé à la boîte dédiée. Cette
 * boîte déclenche l'impression d'une étiquette via une règle Outlook côté
 * laboratoire ("l'imprimer" sur les mails reçus) : le texte doit rester
 * court, en texte brut, sans mise en forme complexe.
 *
 * NOTE — format provisoire : à ajuster dès réception d'une photo d'une
 * étiquette réelle + du texte de l'email correspondant côté client, pour
 * coller exactement au rendu attendu sur l'étiquette.
 */
export function buildProtheseModificationEmailText(
  notification: ProtheseModificationNotification,
): string {
  const lines = [
    "MODIFICATION PROTHESE",
    "",
    `Cabinet : ${notification.practiceName ?? "—"}`,
    `Patient : ${notification.patientName}`,
    `Praticien : ${notification.practitionerName ?? notification.practitionerEmail}`,
    "",
    notification.message,
    "",
    `Reçu le ${formatDateTime(notification.createdAt)}`,
    `Dossier #${notification.requestId.slice(0, 8)}`,
  ];
  return lines.join("\n");
}

/**
 * Envoie la notification "Modifications prothèse" qui déclenche
 * l'impression d'étiquette côté laboratoire.
 *
 * Best-effort : ne fait jamais échouer la création de la demande, toute
 * erreur (config manquante, échec Resend, panne réseau) est uniquement
 * loguée ici — l'appelant peut donc `await` sans try/catch.
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
