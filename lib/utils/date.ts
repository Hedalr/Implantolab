/** Fuseau d’affichage applicatif (SSR Scalingo = UTC sinon). */
export const APP_TIMEZONE = "Europe/Paris";

/** Parse une chaîne `YYYY-MM-DD` comme date LOCALE (sans décalage timezone). */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toValidDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function appDateTimeFormat(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: APP_TIMEZONE,
    ...options,
  });
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

const articleDateFormatter = appDateTimeFormat({
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Formate une date d'article (`Date` ou chaîne libre). Renvoie la valeur telle quelle si invalide. */
export function formatArticleDate(value: string): string {
  const date = toValidDate(value);
  if (!date) return value;
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

const dateTimeNumericFormatter = appDateTimeFormat({
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Ex. "30/07/2026 16:29" (Europe/Paris). */
export function formatDateTime(date: Date): string {
  return dateTimeNumericFormatter.format(date);
}

const dateTimeLongFormatter = appDateTimeFormat({
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Ex. "08 août 2026 à 14:51" (Europe/Paris). */
export function formatDateTimeLong(value: Date | string): string {
  const date = toValidDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return dateTimeLongFormatter.format(date);
}

const dateTimeMediumFormatter = appDateTimeFormat({
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Ex. "08 août 2026, 14:51" (Europe/Paris). */
export function formatDateTimeMedium(value: Date | string): string {
  const date = toValidDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return dateTimeMediumFormatter.format(date);
}

const dateTimeCompactFormatter = appDateTimeFormat({
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Ex. "08 août, 14:51" (Europe/Paris) — bulles chat / listes compactes. */
export function formatDateTimeCompact(value: Date | string): string {
  const date = toValidDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return dateTimeCompactFormatter.format(date);
}

const dateShortFormatter = appDateTimeFormat({
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Ex. "08 août 2026" (Europe/Paris). */
export function formatDateShort(value: Date | string): string {
  const date = toValidDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return dateShortFormatter.format(date);
}

const dateLongFormatter = appDateTimeFormat({
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Ex. "08 août 2026" mois long (Europe/Paris). */
export function formatDateLong(value: Date | string): string {
  const date = toValidDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return dateLongFormatter.format(date);
}
