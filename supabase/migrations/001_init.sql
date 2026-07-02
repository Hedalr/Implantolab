-- =============================================================================
-- IMPLANTOLAB — Migration initiale de l'espace praticien
-- =============================================================================
-- Cette migration crée les tables et les politiques RLS nécessaires à
-- l'espace praticien : cabinets (`practices`), profils applicatifs
-- (`profiles`), périodes de fermeture (`closure_periods`) et demandes
-- (`requests`).
--
-- L'authentification est déléguée à Supabase Auth (`auth.users`).
-- Chaque utilisateur applicatif est rattaché à un cabinet (`practice`)
-- et possède un rôle : `practitioner` ou `admin`.
--
-- À exécuter une seule fois — via la CLI Supabase :
--     supabase db push
-- ou en collant le contenu dans SQL Editor du dashboard.
-- =============================================================================

-- Extension nécessaire pour gen_random_uuid()
create extension if not exists "pgcrypto";

-- =============================================================================
-- Tables
-- =============================================================================

-- practices : les cabinets/praticiens partenaires du laboratoire.
create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

comment on table public.practices is
  'Cabinets partenaires du laboratoire. Un utilisateur est rattaché à un seul cabinet via profiles.practice_id.';

-- profiles : mirroir applicatif de auth.users (1-1 sur l'id).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'practitioner' check (role in ('practitioner', 'admin')),
  practice_id uuid references public.practices(id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Profil applicatif d''un utilisateur Supabase Auth. Rôle et rattachement cabinet.';

-- closure_periods : les créneaux de fermeture déclarés par chaque cabinet.
create table if not exists public.closure_periods (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint closure_periods_dates_check check (end_date >= start_date)
);

comment on table public.closure_periods is
  'Périodes de fermeture déclarées par un cabinet (vacances, ponts, formations).';

-- requests : demandes libres adressées au laboratoire.
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.requests is
  'Demandes textuelles adressées au laboratoire par un cabinet (questions techniques, planning, etc.).';

-- =============================================================================
-- Index
-- =============================================================================

create index if not exists closure_periods_practice_id_idx
  on public.closure_periods (practice_id);

create index if not exists closure_periods_dates_idx
  on public.closure_periods (start_date, end_date);

create index if not exists requests_practice_status_idx
  on public.requests (practice_id, status);

-- =============================================================================
-- Helpers RLS
-- =============================================================================
-- On isole ces vérifications dans des fonctions SECURITY DEFINER pour éviter
-- la récursion des policies (une policy sur `profiles` qui interroge
-- `profiles` provoquerait une boucle infinie sans SECURITY DEFINER).

create or replace function public.user_practice_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select practice_id from public.profiles where id = auth.uid()
$$;

comment on function public.user_practice_id() is
  'Retourne l''identifiant du cabinet rattaché à l''utilisateur courant, ou NULL. Utilisé par les policies RLS.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  )
$$;

comment on function public.is_admin() is
  'Retourne true si l''utilisateur courant a le rôle admin. Utilisé par les policies RLS.';

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.practices enable row level security;
alter table public.profiles enable row level security;
alter table public.closure_periods enable row level security;
alter table public.requests enable row level security;

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or public.is_admin()
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
  on public.profiles
  for insert
  to authenticated
  with check (public.is_admin());

-- --------------------------------------------------------------------------
-- practices
-- --------------------------------------------------------------------------

drop policy if exists "practices_select_own_or_admin" on public.practices;
create policy "practices_select_own_or_admin"
  on public.practices
  for select
  to authenticated
  using (
    id = public.user_practice_id()
    or public.is_admin()
  );

drop policy if exists "practices_insert_admin" on public.practices;
create policy "practices_insert_admin"
  on public.practices
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "practices_update_admin" on public.practices;
create policy "practices_update_admin"
  on public.practices
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "practices_delete_admin" on public.practices;
create policy "practices_delete_admin"
  on public.practices
  for delete
  to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------------------
-- closure_periods
-- --------------------------------------------------------------------------

drop policy if exists "closure_periods_select_own_or_admin" on public.closure_periods;
create policy "closure_periods_select_own_or_admin"
  on public.closure_periods
  for select
  to authenticated
  using (
    practice_id = public.user_practice_id()
    or public.is_admin()
  );

drop policy if exists "closure_periods_insert_own" on public.closure_periods;
create policy "closure_periods_insert_own"
  on public.closure_periods
  for insert
  to authenticated
  with check (
    practice_id = public.user_practice_id()
    or public.is_admin()
  );

drop policy if exists "closure_periods_update_own" on public.closure_periods;
create policy "closure_periods_update_own"
  on public.closure_periods
  for update
  to authenticated
  using (
    practice_id = public.user_practice_id()
    or public.is_admin()
  )
  with check (
    practice_id = public.user_practice_id()
    or public.is_admin()
  );

drop policy if exists "closure_periods_delete_own" on public.closure_periods;
create policy "closure_periods_delete_own"
  on public.closure_periods
  for delete
  to authenticated
  using (
    practice_id = public.user_practice_id()
    or public.is_admin()
  );

-- --------------------------------------------------------------------------
-- requests
-- --------------------------------------------------------------------------

drop policy if exists "requests_select_own_or_admin" on public.requests;
create policy "requests_select_own_or_admin"
  on public.requests
  for select
  to authenticated
  using (
    practice_id = public.user_practice_id()
    or public.is_admin()
  );

drop policy if exists "requests_insert_own" on public.requests;
create policy "requests_insert_own"
  on public.requests
  for insert
  to authenticated
  with check (
    practice_id = public.user_practice_id()
  );

-- L'update est réservé aux admins (typiquement pour changer status
-- open -> closed). Les praticiens ne modifient pas leurs demandes.
drop policy if exists "requests_update_admin" on public.requests;
create policy "requests_update_admin"
  on public.requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- Trigger : création automatique du profil à l'inscription
-- =============================================================================
-- Quand un utilisateur est créé dans auth.users (via Dashboard, invitation
-- ou signup), on insère une ligne profiles minimale. L'admin devra ensuite
-- attribuer la `practice_id` et éventuellement passer `role = 'admin'`.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'practitioner')
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Crée une ligne profiles minimale à chaque création dans auth.users.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
