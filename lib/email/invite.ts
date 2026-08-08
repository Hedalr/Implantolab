import "server-only";

import { getResendClient, isResendConfigured } from "@/lib/email/resend";

const DEFAULT_FROM_EMAIL = "Implantolab <onboarding@resend.dev>";

export type InviteEmailKind = "invite" | "reactivate";

/**
 * Envoi best-effort du lien set-password (invite ou réactivation).
 * Sans RESEND_API_KEY : log sans URL/token (admin récupère via « renvoyer invite »).
 */
export async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  kind?: InviteEmailKind;
  fullName?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  const kind = params.kind ?? "invite";
  const subject =
    kind === "reactivate"
      ? "Implantolab — votre accès a été rétabli"
      : "Implantolab — activez votre compte";
  const greeting = params.fullName?.trim()
    ? `Bonjour ${params.fullName.trim()},`
    : "Bonjour,";
  const intro =
    kind === "reactivate"
      ? "Votre accès à l’espace Implantolab a été rétabli. Choisissez un nouveau mot de passe pour vous reconnecter :"
      : "Vous avez été invité(e) sur l’espace Implantolab. Définissez votre mot de passe pour activer votre compte :";

  const text = [
    greeting,
    "",
    intro,
    "",
    params.inviteUrl,
    "",
    "Ce lien expire dans 7 jours.",
    "",
    "— Implantolab",
  ].join("\n");

  if (!isResendConfigured()) {
    // Ne jamais logger l’URL invite complète (token en clair) — S4 / P2-6.
    console.info(
      `[invite-email] invite créée, email skipped (RESEND_API_KEY absent) — ${kind} pour ${params.to}`,
    );
    return { sent: false };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL;
  try {
    const { error } = await getResendClient().emails.send({
      from,
      to: params.to,
      subject,
      text,
    });
    if (error) {
      console.error("[invite-email] Resend error:", error);
      return {
        sent: false,
        error: typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "smtp",
      };
    }
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[invite-email]", message);
    return { sent: false, error: message };
  }
}
