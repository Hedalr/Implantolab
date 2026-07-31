-- =============================================================================
-- IMPLANTOLAB — Chat Question / Urgence
-- =============================================================================
-- Fil de discussion temps réel sur les demandes subject IN ('Question','Urgence').
-- Tables : request_messages (messages) + request_thread_reads (badges non lus).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint request_messages_body_len check (
    char_length(body) >= 1 and char_length(body) <= 2000
  )
);

create index if not exists request_messages_request_created_idx
  on public.request_messages (request_id, created_at asc);

comment on table public.request_messages is
  'Réponses du fil de discussion Question/Urgence (le message initial reste sur requests.message).';

create table if not exists public.request_thread_reads (
  request_id uuid not null references public.requests (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (request_id, profile_id)
);

comment on table public.request_thread_reads is
  'Dernière lecture du fil par participant (pour badges non lus).';

-- ---------------------------------------------------------------------------
-- 2. Helper d'accès (miroir RLS requests)
-- ---------------------------------------------------------------------------

create or replace function public.can_access_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requests r
    where r.id = p_request_id
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
$$;

comment on function public.can_access_request(uuid) is
  'True si l''utilisateur peut voir la demande (propriétaire, admin, ou staff du secteur).';

create or replace function public.can_reply_to_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_access_request(p_request_id)
    and exists (
      select 1
      from public.requests r
      where r.id = p_request_id
        and r.status = 'open'
        and r.subject in ('Question', 'Urgence')
    )
$$;

comment on function public.can_reply_to_request(uuid) is
  'True si l''utilisateur peut poster un message (demande ouverte Question/Urgence + accès).';

-- ---------------------------------------------------------------------------
-- 3. RLS — request_messages
-- ---------------------------------------------------------------------------

alter table public.request_messages enable row level security;

drop policy if exists "request_messages_select" on public.request_messages;
create policy "request_messages_select"
  on public.request_messages
  for select
  to authenticated
  using (public.can_access_request(request_id));

drop policy if exists "request_messages_insert" on public.request_messages;
create policy "request_messages_insert"
  on public.request_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_reply_to_request(request_id)
  );

-- ---------------------------------------------------------------------------
-- 4. RLS — request_thread_reads
-- ---------------------------------------------------------------------------

alter table public.request_thread_reads enable row level security;

drop policy if exists "request_thread_reads_select" on public.request_thread_reads;
create policy "request_thread_reads_select"
  on public.request_thread_reads
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    and public.can_access_request(request_id)
  );

drop policy if exists "request_thread_reads_insert" on public.request_thread_reads;
create policy "request_thread_reads_insert"
  on public.request_thread_reads
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and public.can_access_request(request_id)
  );

drop policy if exists "request_thread_reads_update" on public.request_thread_reads;
create policy "request_thread_reads_update"
  on public.request_thread_reads
  for update
  to authenticated
  using (
    profile_id = auth.uid()
    and public.can_access_request(request_id)
  )
  with check (
    profile_id = auth.uid()
    and public.can_access_request(request_id)
  );

-- ---------------------------------------------------------------------------
-- 5. Realtime
-- ---------------------------------------------------------------------------

alter table public.request_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.request_messages;
exception
  when duplicate_object then null;
end $$;

revoke execute on function public.can_access_request(uuid) from public, anon;
revoke execute on function public.can_reply_to_request(uuid) from public, anon;
grant execute on function public.can_access_request(uuid) to authenticated;
grant execute on function public.can_reply_to_request(uuid) to authenticated;
