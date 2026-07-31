import type { CookieOptions } from "@supabase/ssr";

/**
 * Options des cookies de session Supabase.
 *
 * Doivent rester IDENTIQUES entre le client browser, le client server et le
 * proxy : des options divergentes produisent des cookies concurrents et des
 * déconnexions aléatoires.
 *
 * Par rapport aux valeurs par défaut de `@supabase/ssr` :
 * - `secure` en production (non positionné par la librairie) ;
 * - `maxAge` ramené de 400 jours à 7 jours, remis à zéro à chaque
 *   rafraîchissement de session — cela borne la fenêtre d'exploitation d'un
 *   cookie volé sur un poste partagé.
 *
 * On ne passe volontairement pas `httpOnly` : `createBrowserClient` doit
 * pouvoir lire le cookie pour ouvrir la connexion Realtime du fil de
 * discussion. La protection contre le vol de jeton repose donc sur la CSP.
 */
export const SUPABASE_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  // En local le site est servi en http : un cookie `Secure` y serait rejeté.
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};
