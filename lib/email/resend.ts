import { Resend } from "resend";

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

let cachedClient: Resend | null = null;

/**
 * Client Resend pour les emails transactionnels du site (ex. notification
 * "Modifications prothèse"), mis en cache pour la durée de vie de l'instance
 * serverless (évite de recréer le client à chaque appel).
 *
 * @throws si `RESEND_API_KEY` n'est pas configuré — tester avec
 * `isResendConfigured()` avant d'appeler.
 */
export function getResendClient(): Resend {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY n'est pas configuré (voir https://resend.com/api-keys).",
    );
  }
  cachedClient = new Resend(apiKey);
  return cachedClient;
}
