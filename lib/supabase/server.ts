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

/** Vérifie que les variables d'environnement Supabase sont bien définies. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Crée un client Supabase pour un composant / route server, connecté au
 * cookie store de la requête Next.js courante.
 *
 * @throws si les variables d'environnement Supabase ne sont pas définies.
 *         Utilisez `isSupabaseConfigured()` en amont pour tester.
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
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
          // `cookies().set` peut échouer si appelé depuis un Server Component
          // en dehors d'une Server Action ou d'une Route Handler. Ce cas est
          // couvert par le middleware qui rafraîchit la session côté requête.
        }
      },
    },
  });
}

/**
 * Retourne l'utilisateur authentifié via `auth.getUser()` (vérifié côté
 * Auth server) ou `null` s'il n'y a pas de session valide / si Supabase
 * n'est pas configuré.
 */
export async function getSessionUser(): Promise<{
  id: string;
  email: string;
} | null> {
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
}

/**
 * Récupère le profil applicatif complet de l'utilisateur courant,
 * en joignant la ligne `practices` associée.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
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

  // Le join `practices ( name )` peut être typé comme objet ou tableau
  // selon la version des types Supabase. On normalise sans dépendre
  // d'une génération de types dédiée.
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
  const practiceRow = Array.isArray(row.practices)
    ? row.practices[0] ?? null
    : row.practices;
  const sectorRow = Array.isArray(row.sectors)
    ? row.sectors[0] ?? null
    : row.sectors;

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
}

/**
 * Redirige vers /espace-praticien/login si l'utilisateur n'est pas
 * authentifié ou si son profil ne peut pas être chargé.
 * Redirige également vers login si Supabase n'est pas configuré
 * (la page login affichera un message expliquant la situation).
 */
export async function requireUser(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
}> {
  if (!isSupabaseConfigured()) {
    redirect(LOGIN_PATH);
  }

  const user = await getSessionUser();
  if (!user) {
    redirect(LOGIN_PATH);
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(LOGIN_PATH);
  }

  return { userId: user.id, email: user.email, profile };
}

/**
 * Comme `requireUser` mais s'assure que le profil a le rôle admin.
 * En cas contraire, redirige vers l'accueil praticien.
 */
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

/**
 * Comme `requireUser` mais s'assure que le profil est admin ou prothésiste
 * (personnel du labo). Utilisé par les routes /espace-praticien/laboratoire.
 */
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
 * Comme `requireUser` mais s'assure que le profil est prothésiste (employé
 * du labo, périmètre du module congés). Un admin qui souhaite voir la page
 * n'est pas concerné : il passe par /espace-praticien/admin/conges.
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
