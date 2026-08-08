import { isUuid } from "@/lib/api/v1/ids";
import { isSectorLabRole, type ProfileRole } from "@/lib/roles";
import { allowedSubjectsForRole } from "@/lib/requests/types";
import { getSql } from "@/lib/db/client";

/** Profil minimal pour les guards (API PgProfile ou Profile web). */
export type AccessProfile = {
  id: string;
  role: ProfileRole;
  sectorId: string | null;
};

/**
 * Guard synchrone sur une row déjà chargée (pages labo / inbox).
 * Miroir de la policy RLS `requests_select_own_or_admin` + filtre sujets lab (P2-7/S5) :
 * owner | admin | (lab rôle + sector match + sujet autorisé pour le rôle).
 * Lab sans secteur → deny (pas de fallback premier secteur / all).
 */
export function canAccessRequestRow(
  profile: AccessProfile,
  request: {
    profileId?: string | null;
    sectorId: string | null;
    subject?: string | null;
  },
): boolean {
  if (request.profileId && request.profileId === profile.id) return true;
  if (profile.role === "admin") return true;
  if (
    isSectorLabRole(profile.role) &&
    profile.sectorId &&
    request.sectorId &&
    profile.sectorId === request.sectorId
  ) {
    const allowed = allowedSubjectsForRole(profile.role);
    if (
      allowed &&
      request.subject != null &&
      request.subject !== "" &&
      !allowed.includes(request.subject)
    ) {
      return false;
    }
    return true;
  }
  return false;
}

export async function canAccessRequest(
  profile: AccessProfile,
  requestId: string,
): Promise<boolean> {
  // Fail-closed : UUID invalide → deny (évite 500 Postgres / énumération).
  if (!isUuid(requestId)) return false;

  const sql = getSql();
  const isAdmin = profile.role === "admin";
  // Fail-closed : rôle lab sans sector_id → jamais d'accès sectoriel.
  const isLab = isSectorLabRole(profile.role) && Boolean(profile.sectorId);
  const allowedSubjects = allowedSubjectsForRole(profile.role);
  const subjects = allowedSubjects ? [...allowedSubjects] : null;

  const rows = await sql<{ ok: boolean }[]>`
    select exists (
      select 1
        from public.requests r
       where r.id = ${requestId}::uuid
         and (
           r.profile_id = ${profile.id}::uuid
           or ${isAdmin}
           or (
             ${isLab}
             and r.sector_id is not null
             and r.sector_id = ${profile.sectorId}::uuid
             and (
               ${subjects}::text[] is null
               or r.subject = any(${subjects}::text[])
             )
           )
         )
    ) as ok
  `;
  return Boolean(rows[0]?.ok);
}

export async function canReplyToRequest(
  profile: AccessProfile,
  requestId: string,
): Promise<boolean> {
  if (!isUuid(requestId)) return false;

  const sql = getSql();
  const rows = await sql<
    { status: string; subject: string; profile_id: string }[]
  >`
    select status, subject, profile_id::text
      from public.requests
     where id = ${requestId}::uuid
     limit 1
  `;
  const request = rows[0];
  if (!request) return false;
  if (!(await canAccessRequest(profile, requestId))) return false;
  if (request.subject !== "Question" && request.subject !== "Urgence") {
    return false;
  }
  if (request.status === "open") return true;
  return (
    request.status === "closed" && request.profile_id === profile.id
  );
}
