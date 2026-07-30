-- =============================================================================
-- IMPLANTOLAB — Rôle chef de secteur
-- =============================================================================
-- Ajoute le rôle `chef_de_secteur` (cadre labo lié à un secteur) :
--   - même visibilité labo que le prothésiste (demandes de son secteur) ;
--   - l'inbox Questions/Urgences est filtrée côté app (RLS = secteur entier).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Contrainte de rôle
-- ---------------------------------------------------------------------------

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('practitioner', 'admin', 'prosthetist', 'chef_de_secteur'));

comment on column public.profiles.role is
  'Rôle applicatif : practitioner, admin, prosthetist, chef_de_secteur.';

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_labo_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role in ('admin', 'prosthetist', 'chef_de_secteur')
      from public.profiles
      where id = auth.uid()
    ),
    false
  )
$$;

comment on function public.is_labo_staff() is
  'True si l''utilisateur courant est admin, prothésiste ou chef de secteur.';

create or replace function public.is_chef_de_secteur()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role = 'chef_de_secteur'
      from public.profiles
      where id = auth.uid()
    ),
    false
  )
$$;

comment on function public.is_chef_de_secteur() is
  'True si l''utilisateur courant est chef de secteur.';

create or replace function public.is_sector_lab_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role in ('prosthetist', 'chef_de_secteur')
      from public.profiles
      where id = auth.uid()
    ),
    false
  )
$$;

comment on function public.is_sector_lab_user() is
  'True si l''utilisateur courant est prothésiste ou chef de secteur (staff labo lié à un secteur).';

-- ---------------------------------------------------------------------------
-- 3. RLS — requests
-- ---------------------------------------------------------------------------

drop policy if exists "requests_select_own_or_admin" on public.requests;
create policy "requests_select_own_or_admin"
  on public.requests
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or (
      public.is_sector_lab_user()
      and sector_id is not null
      and sector_id = public.user_sector_id()
    )
  );

drop policy if exists "requests_update_admin" on public.requests;
drop policy if exists "requests_update_labo" on public.requests;
create policy "requests_update_labo"
  on public.requests
  for update
  to authenticated
  using (
    public.is_admin()
    or (
      public.is_sector_lab_user()
      and sector_id is not null
      and sector_id = public.user_sector_id()
    )
  )
  with check (
    public.is_admin()
    or (
      public.is_sector_lab_user()
      and sector_id is not null
      and sector_id = public.user_sector_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. RLS — request_media + storage
-- ---------------------------------------------------------------------------

drop policy if exists "request_media_select_own_or_admin" on public.request_media;
create policy "request_media_select_own_or_admin"
  on public.request_media
  for select
  to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_media.request_id
        and (
          r.profile_id = auth.uid()
          or public.is_admin()
          or (
            public.is_sector_lab_user()
            and r.sector_id is not null
            and r.sector_id = public.user_sector_id()
          )
        )
    )
  );

create index if not exists requests_sector_subject_created_idx
  on public.requests (sector_id, subject, created_at desc);

