-- =============================================================================
-- IMPLANTOLAB — Migration 005 : secteurs labo sur les demandes
-- =============================================================================
-- 1. Seed des 3 secteurs de production : Numérique, Amovible, Conjoint.
-- 2. Colonne requests.sector_id — le dentiste choisit le secteur à l'envoi.
-- 3. RLS : les prothésistes ne voient que les demandes de leur secteur ;
--    l'admin voit tout. Mise à jour (statut) autorisée pour le staff labo
--    du secteur concerné.
-- 4. Suppression du module WhatsApp (patient_cases, case_*, dentist_contacts).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_sector_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sector_id from public.profiles where id = auth.uid()
$$;

comment on function public.user_sector_id() is
  'Retourne le sector_id du profil courant, ou NULL.';

create or replace function public.is_prosthetist()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'prosthetist' from public.profiles where id = auth.uid()),
    false
  )
$$;

comment on function public.is_prosthetist() is
  'True si l''utilisateur courant est prothésiste.';

-- ---------------------------------------------------------------------------
-- Seed des 3 secteurs labo (idempotent)
-- ---------------------------------------------------------------------------

insert into public.sectors (name, color)
values
  ('Numérique', '#2B6CB0'),
  ('Amovible', '#C05621'),
  ('Conjoint', '#2F855A')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- requests.sector_id
-- ---------------------------------------------------------------------------

alter table public.requests
  add column if not exists sector_id uuid references public.sectors(id) on delete set null;

comment on column public.requests.sector_id is
  'Secteur labo destinataire de la demande (Numérique, Amovible ou Conjoint).';

create index if not exists requests_sector_id_idx
  on public.requests (sector_id);

create index if not exists requests_sector_status_idx
  on public.requests (sector_id, status);

-- ---------------------------------------------------------------------------
-- RLS requests : lecture / MAJ par prothésistes du secteur
-- ---------------------------------------------------------------------------

drop policy if exists "requests_select_own_or_admin" on public.requests;
create policy "requests_select_own_or_admin"
  on public.requests
  for select
  to authenticated
  using (
    practice_id = public.user_practice_id()
    or public.is_admin()
    or (
      public.is_prosthetist()
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
      public.is_prosthetist()
      and sector_id is not null
      and sector_id = public.user_sector_id()
    )
  )
  with check (
    public.is_admin()
    or (
      public.is_prosthetist()
      and sector_id is not null
      and sector_id = public.user_sector_id()
    )
  );

-- ---------------------------------------------------------------------------
-- request_media + storage : lecture prothésistes du secteur
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
          r.practice_id = public.user_practice_id()
          or public.is_admin()
          or (
            public.is_prosthetist()
            and r.sector_id is not null
            and r.sector_id = public.user_sector_id()
          )
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
            r.practice_id = public.user_practice_id()
            or (
              public.is_prosthetist()
              and r.sector_id is not null
              and r.sector_id = public.user_sector_id()
            )
          )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- practices : le staff labo peut lire les noms de cabinets (jointure demandes)
-- ---------------------------------------------------------------------------

drop policy if exists "practices_select_own_or_admin" on public.practices;
create policy "practices_select_own_or_admin"
  on public.practices
  for select
  to authenticated
  using (
    id = public.user_practice_id()
    or public.is_admin()
    or public.is_labo_staff()
  );

-- ---------------------------------------------------------------------------
-- Suppression du module WhatsApp / dossiers patient
-- ---------------------------------------------------------------------------

drop policy if exists "case_media_storage_read_labo" on storage.objects;
drop policy if exists "case_media_all_labo" on public.case_media;
drop policy if exists "case_messages_all_labo" on public.case_messages;
drop policy if exists "patient_cases_select_labo" on public.patient_cases;
drop policy if exists "patient_cases_write_labo" on public.patient_cases;
drop policy if exists "dentist_contacts_all_labo" on public.dentist_contacts;

drop table if exists public.case_media cascade;
drop table if exists public.case_messages cascade;
drop table if exists public.patient_cases cascade;
drop table if exists public.dentist_contacts cascade;

-- Le bucket Storage `case-media` peut être supprimé manuellement depuis
-- Supabase → Storage (la suppression directe via SQL est bloquée en hébergé).

-- =============================================================================
-- Fin de la migration 005_request_sectors
-- =============================================================================
