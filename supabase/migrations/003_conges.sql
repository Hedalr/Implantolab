-- =============================================================================
-- IMPLANTOLAB — Module Congés employés (prothésistes)
-- =============================================================================
-- Cette migration ajoute :
--   1. Une table `sectors` : secteurs d'activité (avec couleur) regroupant les
--      employés du labo (prothésistes).
--   2. Deux colonnes sur `profiles` :
--        - `sector_id`         → rattachement à un secteur (nullable).
--        - `leave_balance_days`→ nombre total de jours de congés attribués
--                                 par l'admin pour l'année en cours.
--   3. Une table `leave_requests` : les demandes de congés déposées par les
--      employés.
--   4. Un trigger `check_leave_request()` `BEFORE INSERT` qui valide côté
--      base de données :
--        - le solde de congés est suffisant ;
--        - aucune autre demande d'un employé du même secteur ne chevauche
--          les dates demandées (blocage strict).
--   5. Les policies RLS associées.
--
-- L'objectif est d'offrir un module HR minimal :
--   • L'admin gère les secteurs, assigne un secteur à chaque employé et
--     attribue un solde de jours.
--   • Les employés posent leurs congés depuis leur espace, avec vérification
--     automatique du solde et absence de chevauchement au sein d'un secteur.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Secteurs
-- -----------------------------------------------------------------------------

create table if not exists public.sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#94a3b8',
  created_at timestamptz not null default now(),
  constraint sectors_name_length check (char_length(name) between 2 and 80),
  constraint sectors_color_format check (color ~ '^#[0-9a-fA-F]{6}$')
);

comment on table public.sectors is
  'Secteurs d''activité des employés du labo (prothèse, accueil, administratif, ...). La couleur est utilisée dans les calendriers et pour empêcher les chevauchements de congés entre collègues du même secteur.';

-- -----------------------------------------------------------------------------
-- 2. Extension de profiles
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists sector_id uuid references public.sectors(id) on delete set null;

alter table public.profiles
  add column if not exists leave_balance_days integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_leave_balance_positive;

alter table public.profiles
  add constraint profiles_leave_balance_positive
  check (leave_balance_days >= 0);

comment on column public.profiles.sector_id is
  'Secteur d''activité de l''employé (utilisé pour les congés). NULL pour un compte non classé ou hors périmètre (praticien externe, admin).';

comment on column public.profiles.leave_balance_days is
  'Nombre de jours de congés attribués par l''admin (compteur global, non par année). Le trigger check_leave_request() bloque les demandes qui dépasseraient ce solde.';

-- -----------------------------------------------------------------------------
-- 3. Demandes de congés
-- -----------------------------------------------------------------------------

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days_count integer not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint leave_requests_dates_check check (end_date >= start_date),
  constraint leave_requests_days_positive check (days_count > 0)
);

comment on table public.leave_requests is
  'Demandes de congés posées par les employés (prothésistes). days_count est calculé côté serveur (jours calendaires inclusifs).';

create index if not exists leave_requests_profile_idx
  on public.leave_requests (profile_id);

create index if not exists leave_requests_dates_idx
  on public.leave_requests (start_date, end_date);

-- -----------------------------------------------------------------------------
-- 4. Trigger de validation
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER : le trigger doit pouvoir lire les demandes de tous les
-- employés du même secteur (RLS restreint la lecture directe à soi-même ou
-- à l'admin). En s'exécutant avec les droits du propriétaire de la fonction,
-- on garantit un contrôle infalsifiable côté DB.

create or replace function public.check_leave_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_sector uuid;
  v_used integer;
  v_conflict record;
  v_full_name text;
  v_days integer;
begin
  -- days_count doit refléter la durée calendaire inclusive (start=end → 1 jour)
  v_days := (new.end_date - new.start_date) + 1;
  new.days_count := v_days;

  select coalesce(leave_balance_days, 0), sector_id, coalesce(full_name, 'un collègue')
    into v_balance, v_sector, v_full_name
    from public.profiles
   where id = new.profile_id;

  if v_balance is null then
    raise exception 'PROFILE_NOT_FOUND: profil introuvable' using errcode = 'P0001';
  end if;

  select coalesce(sum(days_count), 0)
    into v_used
    from public.leave_requests
   where profile_id = new.profile_id;

  if v_used + v_days > v_balance then
    raise exception 'INSUFFICIENT_BALANCE: solde restant %', greatest(v_balance - v_used, 0)
      using errcode = 'P0001';
  end if;

  if v_sector is not null then
    select lr.start_date, lr.end_date, coalesce(p.full_name, 'un collègue') as full_name
      into v_conflict
      from public.leave_requests lr
      join public.profiles p on p.id = lr.profile_id
     where p.sector_id = v_sector
       and lr.profile_id <> new.profile_id
       and lr.start_date <= new.end_date
       and lr.end_date   >= new.start_date
     order by lr.start_date
     limit 1;

    if found then
      raise exception 'SECTOR_CONFLICT: % du % au %',
        v_conflict.full_name,
        to_char(v_conflict.start_date, 'YYYY-MM-DD'),
        to_char(v_conflict.end_date, 'YYYY-MM-DD')
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.check_leave_request() is
  'Trigger BEFORE INSERT sur leave_requests : calcule days_count, vérifie le solde et interdit les chevauchements entre employés du même secteur.';

drop trigger if exists leave_requests_check on public.leave_requests;
create trigger leave_requests_check
  before insert on public.leave_requests
  for each row execute function public.check_leave_request();

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.sectors enable row level security;
alter table public.leave_requests enable row level security;

-- ---- sectors ---------------------------------------------------------------
-- Lecture ouverte à tout utilisateur authentifié (les employés doivent voir
-- leur secteur et sa couleur). Écriture réservée admin.

drop policy if exists "sectors_select_authenticated" on public.sectors;
create policy "sectors_select_authenticated"
  on public.sectors
  for select
  to authenticated
  using (true);

drop policy if exists "sectors_insert_admin" on public.sectors;
create policy "sectors_insert_admin"
  on public.sectors
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "sectors_update_admin" on public.sectors;
create policy "sectors_update_admin"
  on public.sectors
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "sectors_delete_admin" on public.sectors;
create policy "sectors_delete_admin"
  on public.sectors
  for delete
  to authenticated
  using (public.is_admin());

-- ---- leave_requests --------------------------------------------------------
-- Lecture : soi-même OU admin.
-- Insertion : soi-même uniquement (l'admin passe par le service_role si besoin).
-- Suppression : soi-même OU admin.
-- Update : interdit (on supprime + recrée, comme closure_periods).

drop policy if exists "leave_requests_select_self_or_admin" on public.leave_requests;
create policy "leave_requests_select_self_or_admin"
  on public.leave_requests
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "leave_requests_insert_self" on public.leave_requests;
create policy "leave_requests_insert_self"
  on public.leave_requests
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "leave_requests_delete_self_or_admin" on public.leave_requests;
create policy "leave_requests_delete_self_or_admin"
  on public.leave_requests
  for delete
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
  );

-- =============================================================================
-- Fin de la migration 003_conges
-- =============================================================================
