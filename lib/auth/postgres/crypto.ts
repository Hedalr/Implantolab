import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

/** Cost 12 — OWASP recommandé ; rehash progressif au login si hash plus faible. */
export const BCRYPT_COST = 12;

/**
 * Hash bcrypt valide (cost 12) pour égaliser le timing quand l’email est inconnu.
 * Contenu sans importance — jamais stocké en DB.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$owft4Ey2tqTDWxZoeoc8fO37DR.I6.r.AoKREMd3Zn1LKrv3TLbFi";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/** True si le hash stocké est plus faible que le cost courant (rehash au login). */
export function passwordNeedsRehash(passwordHash: string): boolean {
  try {
    const rounds = bcrypt.getRounds(passwordHash);
    return !Number.isFinite(rounds) || rounds < BCRYPT_COST;
  } catch {
    return true;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
