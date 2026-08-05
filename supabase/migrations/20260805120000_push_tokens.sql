-- =============================================================================
-- IMPLANTOLAB — Tokens push Expo + deduplication actualites
-- =============================================================================

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  constraint push_tokens_token_unique unique (token)
);

create index if not exists push_tokens_profile_id_idx
  on public.push_tokens (profile_id);

comment on table public.push_tokens is
  'Jetons Expo Push Notification lies a un profil (app mobile).';

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
  on public.push_tokens
  for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
  on public.push_tokens
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
  on public.push_tokens
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
  on public.push_tokens
  for delete
  to authenticated
  using (profile_id = auth.uid());

create table if not exists public.push_actualite_sent (
  notion_page_id text primary key,
  sent_at timestamptz not null default now()
);

comment on table public.push_actualite_sent is
  'Pages Notion deja notifiees (deduplication webhook Publie).';

alter table public.push_actualite_sent enable row level security;
