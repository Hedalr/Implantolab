/** Parse une chaîne `YYYY-MM-DD` comme date LOCALE (sans décalage timezone). */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const longDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Ex. "3 juillet 2026". */
function formatLongDate(iso: string): string {
  return longDateFormatter.format(parseDateOnly(iso));
}

const articleDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Formate une date d'article (`Date` ou chaîne libre). Renvoie la valeur telle quelle si invalide. */
export function formatArticleDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return articleDateFormatter.format(date);
}

/** "Le …" pour un jour unique, "Du … au …" pour une plage. */
export function formatDateRange(start: string, end: string): string {
  if (start === end) return `Le ${formatLongDate(start)}`;
  return `Du ${formatLongDate(start)} au ${formatLongDate(end)}`;
}

/** Nombre de jours calendaires inclusifs entre deux dates `YYYY-MM-DD`. */
export function countInclusiveDays(start: string, end: string): number {
  const s = parseDateOnly(start).getTime();
  const e = parseDateOnly(end).getTime();
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}
