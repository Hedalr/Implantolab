/**
 * Normalisation légère de numéros de téléphone vers le format E.164.
 *
 * Volontairement simple pour ne pas ajouter de dépendance. Meta livre déjà
 * le champ `from` en E.164 sans le "+" (ex. "33612345678"), donc l'essentiel
 * est de re-préfixer et de nettoyer. Pour un labo mono-pays, la stratégie
 * de repli est FR (+33) si le numéro commence par 0.
 */

const DEFAULT_COUNTRY_CODE = "+33";

/**
 * Convertit une entrée arbitraire en E.164 (ex. "+33612345678").
 *
 * Règles :
 *  - Supprime tout caractère non numérique sauf le "+" initial.
 *  - Si le résultat commence déjà par "+", on le renvoie tel quel.
 *  - Sinon, si la chaîne commence par "00", on remplace par "+".
 *  - Sinon, si la chaîne commence par "0", on remplace par le code pays défaut.
 *  - Sinon, si la chaîne est purement numérique (≥ 7 chiffres), on préfixe
 *    par "+" en supposant qu'elle est déjà internationale (cas Meta webhook).
 *
 * Retourne `null` si le résultat n'a pas la forme +[1-9]xxxxxxxxx (7-15 digits).
 */
export function normalizePhoneE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");

  let candidate: string;
  if (hasPlus) {
    candidate = "+" + digits;
  } else if (digits.startsWith("00")) {
    candidate = "+" + digits.slice(2);
  } else if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 11) {
    candidate = DEFAULT_COUNTRY_CODE + digits.slice(1);
  } else if (digits.length >= 7 && digits.length <= 15) {
    candidate = "+" + digits;
  } else {
    return null;
  }

  if (!/^\+[1-9][0-9]{6,14}$/.test(candidate)) {
    return null;
  }

  return candidate;
}

/** Retourne un affichage lisible (ex. "+33 6 12 34 56 78" pour la France). */
export function formatPhoneForDisplay(e164: string | null | undefined): string {
  if (!e164) return "";
  if (e164.startsWith("+33") && e164.length === 12) {
    const rest = e164.slice(3);
    return (
      "+33 " +
      rest.charAt(0) +
      " " +
      rest.slice(1).match(/.{1,2}/g)?.join(" ")
    );
  }
  return e164;
}
