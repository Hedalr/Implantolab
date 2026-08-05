/**
 * Vérifie `Authorization: Bearer <env>` pour les routes API internes
 * (cron Vercel, webhooks Supabase).
 */
export function assertBearerSecret(
  request: Request,
  envName: string,
): Response | null {
  const secret = process.env[envName];
  if (!secret) {
    return Response.json({ error: `${envName} manquant` }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
