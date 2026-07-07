/**
 * Notification Slack via Incoming Webhook.
 *
 * Le webhook URL doit être stocké dans SLACK_WEBHOOK_URL. Si absent, la fonction
 * ne fait rien (aucune erreur remontée) pour que l'ingestion continue à
 * fonctionner sans Slack configuré.
 */

import type { PatientCase } from "@/lib/labo/types";
import { CASE_PRIORITY_LABELS, CASE_STATUS_LABELS } from "@/lib/labo/types";
import { formatPhoneForDisplay } from "@/lib/labo/phone";

function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Envoie une notification Slack pour un dossier patient nouvellement créé
 * ou mis à jour par le webhook WhatsApp.
 */
export async function notifySlackNewCase(params: {
  caseRow: PatientCase;
  mediaCount: number;
  isNewCase: boolean;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { caseRow, mediaCount, isNewCase } = params;
  const url = `${siteUrl()}/espace-praticien/laboratoire/${caseRow.id}`;
  const priorityLabel = CASE_PRIORITY_LABELS[caseRow.priority];
  const statusLabel = CASE_STATUS_LABELS[caseRow.status];

  const title = isNewCase
    ? `Nouveau dossier ${caseRow.caseNumber}`
    : `Mise à jour ${caseRow.caseNumber}`;

  const lines: string[] = [];
  lines.push(`*Patient*: ${caseRow.patientName ?? "_non identifié_"}`);
  if (caseRow.dentistNameRaw) {
    lines.push(`*Dentiste*: ${caseRow.dentistNameRaw}`);
  } else if (caseRow.dentistPhoneE164) {
    lines.push(`*Dentiste*: ${formatPhoneForDisplay(caseRow.dentistPhoneE164)}`);
  }
  if (caseRow.workType) lines.push(`*Travail*: ${caseRow.workType}`);
  lines.push(`*Statut*: ${statusLabel} — priorité ${priorityLabel}`);
  if (mediaCount > 0) {
    lines.push(`*Pièces jointes*: ${mediaCount} nouvelle(s)`);
  }
  if (caseRow.needsReview) {
    lines.push("_À valider — extraction IA à vérifier._");
  }

  const payload = {
    text: `${title} — ${caseRow.patientName ?? "patient inconnu"}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: title, emoji: false },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: lines.join("\n") },
      },
      ...(caseRow.description
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `> ${caseRow.description.slice(0, 500)}`,
              },
            },
          ]
        : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Ouvrir le dossier" },
            url,
            style: "primary",
          },
        ],
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Slack down ne doit pas casser l'ingestion. On avale l'erreur.
  }
}
