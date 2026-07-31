-- =============================================================================
-- Purge Storage `request-media` — DELETE policies + file d’attente
-- =============================================================================
-- Supabase interdit le DELETE SQL direct sur storage.objects (protect_delete) :
-- la suppression réelle passe par l’API Storage (voir
-- /api/cron/purge-request-media + lib/requests/purge-request-media.ts).
--
-- Cette migration :
-- 1. ajoute les policies DELETE (table + storage) ;
-- 2. file d’attente remplie par trigger quand une métadonnée est effacée ;
-- 3. RPC listant les orphelins déjà présents (backfill).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Policies DELETE — métadonnées
-- ---------------------------------------------------------------------------

drop policy if exists "request_media_delete_own_or_admin" on public.request_media;
create policy "request_media_delete_own_or_admin"
  on public.request_media
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_media.request_id
        and (
          r.profile_id = auth.uid()
          or public.is_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Policies DELETE — storage.objects (API Storage / clients authentifiés)
-- ---------------------------------------------------------------------------

drop policy if exists "request_media_storage_delete_own_or_admin" on storage.objects;
create policy "request_media_storage_delete_own_or_admin"
  on storage.objects
  for delete
  to authenticated
  using (
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

-- ---------------------------------------------------------------------------
-- 3. File d’attente de purge (traitée par le cron Next.js)
-- ---------------------------------------------------------------------------

create table if not exists public.storage_purge_queue (
  id bigint generated always as identity primary key,
  bucket text not null,
  path text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

comment on table public.storage_purge_queue is
  'Chemins Storage à supprimer via l’API (remplie par trigger, vidée par cron).';

create index if not exists storage_purge_queue_pending_idx
  on public.storage_purge_queue (created_at)
  where processed_at is null;

alter table public.storage_purge_queue enable row level security;
-- Aucune policy pour anon/authenticated : seul service_role (bypass RLS) lit/écrit.

create or replace function public.enqueue_request_media_storage_purge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.storage_purge_queue (bucket, path)
  values (
    coalesce(old.storage_bucket, 'request-media'),
    old.storage_path
  );
  return old;
end;
$$;

comment on function public.enqueue_request_media_storage_purge() is
  'Enfile le chemin Storage après suppression d’une ligne request_media.';

drop trigger if exists request_media_enqueue_storage_purge on public.request_media;
create trigger request_media_enqueue_storage_purge
  after delete on public.request_media
  for each row
  execute function public.enqueue_request_media_storage_purge();

revoke all on function public.enqueue_request_media_storage_purge() from public;

-- ---------------------------------------------------------------------------
-- 4. RPC : lister les orphelins (Storage sans métadonnée)
-- ---------------------------------------------------------------------------

create or replace function public.list_orphan_request_media_paths()
returns table (bucket text, path text)
language sql
security definer
set search_path = ''
as $$
  select o.bucket_id::text as bucket, o.name::text as path
  from storage.objects o
  left join public.request_media rm
    on rm.storage_path = o.name
   and rm.storage_bucket = o.bucket_id
  where o.bucket_id = 'request-media'
    and rm.id is null;
$$;

comment on function public.list_orphan_request_media_paths() is
  'Objets request-media sans ligne request_media — à supprimer via l’API Storage.';

revoke all on function public.list_orphan_request_media_paths() from public;
grant execute on function public.list_orphan_request_media_paths() to service_role;

-- Backfill : enfiler les orphelins déjà présents
insert into public.storage_purge_queue (bucket, path)
select o.bucket, o.path
from public.list_orphan_request_media_paths() o
where not exists (
  select 1
  from public.storage_purge_queue q
  where q.bucket = o.bucket
    and q.path = o.path
    and q.processed_at is null
);
