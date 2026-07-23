import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Profil applicatif exposé aux composants server et aux routes.
 *
 * NOTE — CONTRAT PARTAGÉ : cette forme est consommée par les agents
 * "praticien-ui" et "admin-cal". Toute évolution doit être rétro-compatible
 * (ne pas retirer ou renommer de champ existant sans coordination).
 */
export type Profile = {
  id: string;
  email: string;
  role: "practitioner" | "admin" | "prosthetist";
  practiceId: string | null;
  practiceName: string | null;
  fullName: string | null;
  sectorId: string | null;
  sectorName: string | null;
  sectorColor: string | null;
  leaveBalanceDays: number;
};

const LOGIN_PATH = "/espace-praticien/login";
const DEFAULT_PRACTITIONER_HOME = "/espace-praticien/demandes";
const DEFAULT_LABO_HOME = "/espace-praticien/laboratoire";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Client Supabase server lié aux cookies de la requête.
 * Mis en `cache()` pour partager le client dans une même requête RSC.
 * @throws si Supabase n'est pas configuré — tester avec `isSupabaseConfigured()`.
 */
export const getServerSupabase = cache(async (): Promise<SupabaseClient> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase n'est pas configuré : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définis.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // `cookies().set` échoue hors Server Action / Route Handler ;
          // le middleware rafraîchit la session côté requête.
        }
      },
    },
  });
});

/** Utilisateur Auth vérifié, ou null. `cache()` = un getUser par requête. */
export const getSessionUser = cache(async (): Promise<{
  id: string;
  email: string;
} | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return null;
  }

  return { id: user.id, email: user.email };
});

/**
 * Profil applicatif + jointures practices/sectors.
 * Mis en `cache()` pour éviter les doubles lectures dans layout + page.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, role, practice_id, full_name, sector_id, leave_balance_days, practices ( name ), sectors ( name, color )",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  // Join typé objet ou tableau selon les types Supabase — on normalise.
  const row = data as unknown as {
    id: string;
    role: Profile["role"] | null;
    practice_id: string | null;
    full_name: string | null;
    sector_id: string | null;
    leave_balance_days: number | null;
    practices: { name: string | null } | { name: string | null }[] | null;
    sectors:
      | { name: string | null; color: string | null }
      | { name: string | null; color: string | null }[]
      | null;
  };
  const practiceRow = firstRelation(row.practices);
  const sectorRow = firstRelation(row.sectors);

  return {
    id: row.id,
    email: user.email,
    role: row.role ?? "practitioner",
    practiceId: row.practice_id ?? null,
    practiceName: practiceRow?.name ?? null,
    fullName: row.full_name ?? null,
    sectorId: row.sector_id ?? null,
    sectorName: sectorRow?.name ?? null,
    sectorColor: sectorRow?.color ?? null,
    leaveBalanceDays: row.leave_balance_days ?? 0,
  };
});

/** Redirige vers login si non authentifié / profil introuvable / Supabase off. */
export async function requireUser(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
}> {
  if (!isSupabaseConfigured()) {
    redirect(LOGIN_PATH);
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(LOGIN_PATH);
  }

  return { userId: profile.id, email: profile.email, profile };
}

/** Comme `requireUser`, rôle admin requis. */
export async function requireAdmin(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
}> {
  const session = await requireUser();
  if (session.profile.role !== "admin") {
    redirect(DEFAULT_PRACTITIONER_HOME);
  }
  return session;
}

/** Comme `requireUser`, admin ou prothésiste (labo). */
export async function requireLaboStaff(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
}> {
  const session = await requireUser();
  if (session.profile.role !== "admin" && session.profile.role !== "prosthetist") {
    redirect(DEFAULT_PRACTITIONER_HOME);
  }
  return session;
}

/**
 * Prothésiste uniquement — les admins passent par /espace-praticien/admin/conges.
 */
export async function requireProsthetist(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
}> {
  const session = await requireUser();
  if (session.profile.role !== "prosthetist") {
    redirect(
      session.profile.role === "admin" ? DEFAULT_LABO_HOME : DEFAULT_PRACTITIONER_HOME,
    );
  }
  return session;
}
