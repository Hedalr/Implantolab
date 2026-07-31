/** Lecture d'un champ texte de formulaire — même contrat que les Server Actions. */
export function readFormText(data: FormData, name: string): string {
  return String(data.get(name) ?? "").trim();
}

/**
 * Construit un lien `mailto:`.
 *
 * `URLSearchParams` encode l'espace en "+", que les clients mail affichent
 * littéralement : on le réécrit en "%20".
 */
export function buildMailtoHref({
  to,
  subject,
  body,
}: {
  to: string;
  subject?: string;
  body?: string;
}): string {
  const query = new URLSearchParams();
  if (subject) query.set("subject", subject);
  if (body) query.set("body", body);

  const search = query.toString().replace(/\+/g, "%20");
  return search ? `mailto:${to}?${search}` : `mailto:${to}`;
}

/**
 * Assemble un corps de message : une ligne « Libellé : valeur » par champ
 * renseigné, puis le message libre. Les champs laissés vides sont ignorés.
 */
export function buildMailtoBody(
  data: FormData,
  fields: { label: string; name: string }[],
  message: string,
): string {
  const lines = fields.flatMap((field) => {
    const value = readFormText(data, field.name);
    return value ? [`${field.label} : ${value}`] : [];
  });

  return [...lines, "", message].join("\n");
}
