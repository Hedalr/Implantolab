-- =============================================================================
-- IMPLANTOLAB — Migration 004 : photos jointes aux demandes praticien
-- =============================================================================
-- Permet à un praticien de joindre des photos à une demande envoyée depuis
-- /espace-praticien/demandes (en plus du texte). Reprend le pattern déjà en
-- place pour `case_media` (002_labo.sql) : bucket Storage privé + table de
-- métadonnées, mais ici les écritures se font avec le client authentifié du
-- praticien (RLS), pas avec la clé service_role — le contexte est toujours
-- une session utilisateur, contrairement au webhook WhatsApp.
--
-- À exécuter une seule fois — via la CLI Supabase :
--     supabase db push
-- ou en collant le contenu dans SQL Editor du dashboard.
-- =============================================================================

-- =============================================================================
-- Table
-- =============================================================================

create table if not exists public.request_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  storage_bucket text not null default 'request-media',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  original_filename text,
  created_at timestamptz not null default now()
);

comment on table public.request_media is
  'Photos jointes par un praticien à une demande (public.requests).';

create index if not exists request_media_request_id_idx
  on public.request_media (request_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.request_media enable row level security;

drop policy if exists "request_media_select_own_or_admin" on public.request_media;
create policy "request_media_select_own_or_admin"
  on public.request_media
  for select
  to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_media.request_id
        and (r.practice_id = public.user_practice_id() or public.is_admin())
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
        and r.practice_id = public.user_practice_id()
    )
  );

-- =============================================================================
-- Storage — bucket privé `request-media`
-- =============================================================================
-- Le bucket est privé : upload et lecture passent tous les deux par le
-- client authentifié du praticien/admin (RLS ci-dessous), pas par
-- service_role. Les téléchargements passent par une signed URL générée par
-- /api/request-media/[id].
--
-- Chemin de stockage attendu : requests/{request_id}/{fichier}
-- (storage.foldername(name))[2] correspond donc au request_id.

insert into storage.buckets (id, name, public)
values ('request-media', 'request-media', false)
on conflict (id) do nothing;

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
          and r.practice_id = public.user_practice_id()
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
          and r.practice_id = public.user_practice_id()
      )
    )
  );

-- =============================================================================
-- Fin de la migration 004_request_media
-- =============================================================================
