-- =============================================================================
-- IMPLANTOLAB — Suppression du concept de cabinet (practices)
-- =============================================================================
-- Le rattachement praticien → cabinet → demandes/fermetures est remplacé par
-- un rattachement direct praticien → demandes/fermetures. Chaque dentiste est
-- désormais sa propre entité : plus de regroupement ni de tri par cabinet.
--
-- 1. Ajoute requests.profile_id / closure_periods.profile_id (backfill depuis
--    created_by, avec repli sur l'ancien practice_id si created_by est NULL).
-- 2. Réécrit le rate-limit de création de demandes par profile_id.
-- 3. Réécrit les RLS de closure_periods, requests, request_media et
--    storage.objects pour utiliser profile_id = auth.uid().
-- 4. Supprime user_practice_id(), profiles.practice_id et la table practices.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Nouvelle colonne profile_id + backfill
-- -----------------------------------------------------------------------------

alter table public.closure_periods
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

alter table public.requests
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

-- Cas nominal : le créateur de la ligne est le dentiste propriétaire.
update public.closure_periods
   set profile_id = created_by
 where profile_id is null
   and created_by is not null;

update public.requests
   set profile_id = created_by
 where profile_id is null
   and created_by is not null;

-- Repli pour les lignes historiques sans created_by (compte supprimé depuis) :
-- si un seul praticien est encore rattaché à l'ancien cabinet, on le rattache.
update public.closure_periods cp
   set profile_id = sub.profile_id
  from (
    select practice_id, min(id) as profile_id
      from public.profiles
     where role = 'practitioner'
       and practice_id is not null
     group by practice_id
    having count(*) = 1
  ) sub
 where cp.profile_id is null
   and cp.practice_id = sub.practice_id;

update public.requests r
   set profile_id = sub.profile_id
  from (
    select practice_id, min(id) as profile_id
      from public.profiles
     where role = 'practitioner'
       and practice_id is not null
     group by practice_id
    having count(*) = 1
  ) sub
 where r.profile_id is null
   and r.practice_id = sub.practice_id;

-- Toute ligne restée orpheline (aucun praticien identifiable) est supprimée :
-- elle ne peut plus être rattachée à personne et bloquerait le NOT NULL.
delete from public.closure_periods where profile_id is null;
delete from public.requests where profile_id is null;

alter table public.closure_periods
  alter column profile_id set not null;

alter table public.requests
  alter column profile_id set not null;

drop index if exists public.closure_periods_practice_id_idx;
create index if not exists closure_periods_profile_id_idx
  on public.closure_periods (profile_id);

drop index if exists public.requests_practice_status_idx;
create index if not exists requests_profile_status_idx
  on public.requests (profile_id, status);

drop index if exists public.requests_practice_created_at_idx;
create index if not exists requests_profile_created_at_idx
  on public.requests (profile_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 2. Rate-limit de création de demandes, par dentiste
-- -----------------------------------------------------------------------------

create or replace function public.enforce_request_creation_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    new.created_by := auth.uid();
    new.created_at := pg_catalog.now();

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.profile_id::text, 0)
    );

    if (
      select pg_catalog.count(*) >= 5
        from public.requests
       where profile_id = new.profile_id
         and created_at >= pg_catalog.now() - interval '15 minutes'
    ) then
      raise exception 'REQUEST_RATE_LIMIT' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.enforce_request_creation_rate_limit() is
  'Limits each dentist (profile) to five new requests per rolling 15-minute window.';

-- -----------------------------------------------------------------------------
-- 3. RLS — closure_periods
-- -----------------------------------------------------------------------------

drop policy if exists "closure_periods_select_own_or_admin" on public.closure_periods;
create policy "closure_periods_select_own_or_admin"
  on public.closure_periods
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "closure_periods_insert_own" on public.closure_periods;
create policy "closure_periods_insert_own"
  on public.closure_periods
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "closure_periods_update_own" on public.closure_periods;
create policy "closure_periods_update_own"
  on public.closure_periods
  for update
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
  )
  with check (
    profile_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "closure_periods_delete_own" on public.closure_periods;
create policy "closure_periods_delete_own"
  on public.closure_periods
  for delete
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 4. RLS — requests
-- -----------------------------------------------------------------------------

drop policy if exists "requests_select_own_or_admin" on public.requests;
create policy "requests_select_own_or_admin"
  on public.requests
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or (
      public.is_prosthetist()
      and sector_id is not null
      and sector_id = public.user_sector_id()
    )
  );

drop policy if exists "requests_insert_own" on public.requests;
create policy "requests_insert_own"
  on public.requests
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- 5. RLS — request_media + storage
-- -----------------------------------------------------------------------------

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
            public.is_prosthetist()
            and r.sector_id is not null
            and r.sector_id = public.user_sector_id()
          )
        )
    )
  );

drop policy if exists "request_media_insert_own" on public.request_media;
create policy "request_media_insert_own"
  on public.request_media
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.requests r
      where r.id = request_media.request_id
        and r.profile_id = auth.uid()
    )
  );

drop policy if exists "request_media_storage_insert_own" on storage.objects;
create policy "request_media_storage_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'request-media'
    and (
      public.is_admin()
      or exists (
        select 1 from public.requests r
        where r.id::text = (storage.foldername(name))[2]
          and r.profile_id = auth.uid()
      )
    )
  );

drop policy if exists "request_media_storage_read_own_or_admin" on storage.objects;
create policy "request_media_storage_read_own_or_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'request-media'
    and (
      public.is_admin()
      or exists (
        select 1 from public.requests r
        where r.id::text = (storage.foldername(name))[2]
          and (
            r.profile_id = auth.uid()
            or (
              public.is_prosthetist()
              and r.sector_id is not null
              and r.sector_id = public.user_sector_id()
            )
          )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 6. Suppression du cabinet : colonnes, fonction, table
-- -----------------------------------------------------------------------------

alter table public.closure_periods drop column if exists practice_id;
alter table public.requests drop column if exists practice_id;

drop function if exists public.user_practice_id();

alter table public.profiles drop column if exists practice_id;

drop table if exists public.practices cascade;

-- =============================================================================
-- Fin de la migration 20260730180000_remove_practices
-- =============================================================================
