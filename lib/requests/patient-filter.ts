import { cookies } from "next/headers";

/**
 * Filtre patient stocké en cookie httpOnly (pas dans l’URL) pour éviter
 * les fuites via logs Vercel, historique navigateur et Referer.
 */
export const PATIENT_FILTER_SCOPES = {
  laboratoire: "il_pf_lab",
  adminDemandes: "il_pf_admin_demandes",
  adminProthese: "il_pf_admin_prothese",
} as const;

export type PatientFilterScope = keyof typeof PATIENT_FILTER_SCOPES;

const PATIENT_FILTER_MAX_LENGTH = 120;
const PATIENT_FILTER_MAX_AGE_SECONDS = 60 * 60 * 8;

export function isPatientFilterScope(
  value: unknown,
): value is PatientFilterScope {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PATIENT_FILTER_SCOPES, value)
  );
}

export function sanitizePatientFilter(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, PATIENT_FILTER_MAX_LENGTH);
}

/**
 * N’accepte que des chemins relatifs de l’espace praticien.
 * Retire aussi un éventuel `?patient=` legacy.
 */
export function safeEspacePraticienPath(
  value: unknown,
  fallback = "/espace-praticien",
): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!raw.startsWith("/espace-praticien")) return fallback;
  if (raw.startsWith("//") || raw.includes("://")) return fallback;

  try {
    const url = new URL(raw, "https://implantolab.invalid");
    if (!url.pathname.startsWith("/espace-praticien")) return fallback;
    url.searchParams.delete("patient");
    const search = url.searchParams.toString();
    return search ? `${url.pathname}?${search}` : url.pathname;
  } catch {
    return fallback;
  }
}

function cookieOptions() {
  return {
    path: "/espace-praticien",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: PATIENT_FILTER_MAX_AGE_SECONDS,
  };
}

export async function getPatientFilter(
  scope: PatientFilterScope,
): Promise<string> {
  const cookieStore = await cookies();
  return sanitizePatientFilter(
    cookieStore.get(PATIENT_FILTER_SCOPES[scope])?.value,
  );
}

export async function writePatientFilter(
  scope: PatientFilterScope,
  patient: string,
): Promise<void> {
  const cookieStore = await cookies();
  const name = PATIENT_FILTER_SCOPES[scope];
  const cleaned = sanitizePatientFilter(patient);

  if (!cleaned) {
    cookieStore.delete({ name, path: "/espace-praticien" });
    return;
  }

  cookieStore.set(name, cleaned, cookieOptions());
}

export async function clearPatientFilterCookie(
  scope: PatientFilterScope,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({
    name: PATIENT_FILTER_SCOPES[scope],
    path: "/espace-praticien",
  });
}
