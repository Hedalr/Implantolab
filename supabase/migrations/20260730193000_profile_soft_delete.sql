-- =============================================================================
-- IMPLANTOLAB — Désactivation (soft delete) des comptes praticien / employé
-- =============================================================================
-- L'admin doit pouvoir retirer l'accès d'un praticien ou d'un employé sans
-- perdre l'historique associé (demandes, congés, fermetures) et sans bloquer
-- définitivement son adresse e-mail : le compte Supabase Auth est banni
-- (`ban_duration`) plutôt que supprimé, et `profiles.deleted_at` marque la
-- désactivation côté applicatif. Une réactivation lève le ban, remet
-- `deleted_at` à NULL et renvoie un e-mail de réinitialisation de mot de
-- passe — sans jamais recréer de ligne ni perdre l'historique.
-- =============================================================================

alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Date de désactivation du compte par un admin (accès Auth révoqué via ban_duration). NULL = compte actif. L''historique (requests, leave_requests, closure_periods) est conservé.';

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is not null;

-- =============================================================================
-- Fin de la migration 20260730193000_profile_soft_delete
-- =============================================================================
