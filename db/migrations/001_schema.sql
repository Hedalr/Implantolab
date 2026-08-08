-- =============================================================================
-- IMPLANTOLAB — Schéma Postgres plain (Scalingo / Docker local)
-- =============================================================================
-- Port du schéma métier Supabase SANS :
--   - auth.users / auth.uid()
--   - Storage Supabase / Realtime / Vault / pg_net / RLS
--
-- Auth applicative : table public.users + sessions gérées par Next.js.
-- Autorisations : dans le code app (DATA_BACKEND=postgres).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Auth (remplace Supabase Auth)
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  email_confirmed_at timestamptz,
  banned_until timestamptz,
  invite_token_hash text,
  invite_token_expires_at timestamptz,
  password_reset_token_hash text,
  password_reset_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is
  'Comptes applicatifs (remplace auth.users Supabase).';

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

comment on table public.sessions is
  'Sessions cookie httpOnly (token hashé côté serveur).';

-- ---------------------------------------------------------------------------
-- Secteurs
-- ---------------------------------------------------------------------------

create table if not exists public.sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#94a3b8',
  created_at timestamptz not null default now(),
  constraint sectors_name_length check (char_length(name) between 2 and 80),
  constraint sectors_color_format check (color ~ '^#[0-9a-fA-F]{6}$')
);

-- ---------------------------------------------------------------------------
-- Profiles (1-1 avec users)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references public.users (id) on delete cascade,
  role text not null default 'practitioner'
    check (role in ('practitioner', 'admin', 'prosthetist', 'chef_de_secteur')),
  sector_id uuid references public.sectors (id) on delete set null,
  leave_balance_days integer not null default 0
    check (leave_balance_days >= 0),
  full_name text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is not null;

create index if not exists profiles_sector_id_idx
  on public.profiles (sector_id);

-- ---------------------------------------------------------------------------
-- Fermetures praticiens
-- ---------------------------------------------------------------------------

create table if not exists public.closure_periods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  note text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint closure_periods_dates_check check (end_date >= start_date)
);

create index if not exists closure_periods_profile_id_idx
  on public.closure_periods (profile_id);

create index if not exists closure_periods_dates_idx
  on public.closure_periods (start_date, end_date);

-- ---------------------------------------------------------------------------
-- Demandes labo
-- ---------------------------------------------------------------------------

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  sector_id uuid references public.sectors (id) on delete set null,
  subject text not null,
  message text not null,
  patient_name text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists requests_profile_status_idx
  on public.requests (profile_id, status);

create index if not exists requests_profile_created_at_idx
  on public.requests (profile_id, created_at desc);

create index if not exists requests_sector_id_idx
  on public.requests (sector_id);

create index if not exists requests_sector_status_idx
  on public.requests (sector_id, status);

create index if not exists requests_sector_subject_created_idx
  on public.requests (sector_id, subject, created_at desc);

create index if not exists requests_patient_name_lower_idx
  on public.requests (lower(patient_name));

-- Rate-limit création demandes (par dentiste)
create or replace function public.enforce_request_creation_rate_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at := coalesce(new.created_at, now());

  perform pg_advisory_xact_lock(hashtextextended(new.profile_id::text, 0));

  if (
    select count(*) >= 5
      from public.requests
     where profile_id = new.profile_id
       and created_at >= now() - interval '15 minutes'
  ) then
    raise exception 'REQUEST_RATE_LIMIT' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists requests_rate_limit on public.requests;
create trigger requests_rate_limit
  before insert on public.requests
  for each row execute function public.enforce_request_creation_rate_limit();

-- Defense-in-depth : seul `status` est mutable (contenu / ownership immuables).
-- Miroir du trigger Supabase `protect_request_update_fields` — appliqué à tout
-- rôle DB (postgres dual-mode n’a pas de rôle `authenticated` / is_admin()).
create or replace function public.protect_request_update_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (to_jsonb(new) - 'status') is distinct from
     (to_jsonb(old) - 'status') then
    raise exception 'request content and ownership are immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_request_update_fields on public.requests;
create trigger protect_request_update_fields
  before update on public.requests
  for each row execute function public.protect_request_update_fields();

comment on function public.protect_request_update_fields() is
  'Allows updates to requests.status only; other columns are immutable.';

-- ---------------------------------------------------------------------------
-- Médias demandes (fichiers hors DB — chemins locaux / objet)
-- ---------------------------------------------------------------------------

create table if not exists public.request_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  storage_bucket text not null default 'request-media',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  original_filename text,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists request_media_request_id_idx
  on public.request_media (request_id);

create table if not exists public.storage_purge_queue (
  id bigint generated always as identity primary key,
  bucket text not null,
  path text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index if not exists storage_purge_queue_pending_idx
  on public.storage_purge_queue (created_at)
  where processed_at is null;

create or replace function public.enqueue_request_media_storage_purge()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.storage_purge_queue (bucket, path)
  values (old.storage_bucket, old.storage_path);
  return old;
end;
$$;

drop trigger if exists request_media_enqueue_purge on public.request_media;
create trigger request_media_enqueue_purge
  after delete on public.request_media
  for each row execute function public.enqueue_request_media_storage_purge();

-- ---------------------------------------------------------------------------
-- Chat demandes
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

create table if not exists public.request_thread_reads (
  request_id uuid not null references public.requests (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (request_id, profile_id)
);

create or replace function public.reopen_request_on_owner_message()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.requests
     set status = 'open'
   where id = new.request_id
     and status = 'closed'
     and profile_id = new.sender_id
     and subject in ('Question', 'Urgence');
  return new;
end;
$$;

drop trigger if exists reopen_request_on_owner_message on public.request_messages;
create trigger reopen_request_on_owner_message
  after insert on public.request_messages
  for each row execute function public.reopen_request_on_owner_message();

-- ---------------------------------------------------------------------------
-- Congés employés
-- ---------------------------------------------------------------------------

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days_count integer not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint leave_requests_dates_check check (end_date >= start_date),
  constraint leave_requests_days_positive check (days_count > 0)
);

create index if not exists leave_requests_profile_idx
  on public.leave_requests (profile_id);

create index if not exists leave_requests_dates_idx
  on public.leave_requests (start_date, end_date);

create index if not exists leave_requests_status_idx
  on public.leave_requests (status);

create or replace function public.check_leave_request()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_balance integer;
  v_sector uuid;
  v_used integer;
  v_conflict record;
  v_days integer;
begin
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;

  if new.status = 'rejected' then
    return new;
  end if;

  v_days := (new.end_date - new.start_date) + 1;
  new.days_count := v_days;

  select coalesce(leave_balance_days, 0), sector_id
    into v_balance, v_sector
    from public.profiles
   where id = new.profile_id;

  if v_balance is null then
    raise exception 'PROFILE_NOT_FOUND: profil introuvable' using errcode = 'P0001';
  end if;

  select coalesce(sum(days_count), 0)
    into v_used
    from public.leave_requests
   where profile_id = new.profile_id
     and status in ('pending', 'approved')
     and (tg_op = 'INSERT' or id <> new.id);

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
       and lr.status in ('pending', 'approved')
       and (tg_op = 'INSERT' or lr.id <> new.id)
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

drop trigger if exists leave_requests_check on public.leave_requests;
create trigger leave_requests_check
  before insert or update of start_date, end_date, days_count, status, profile_id
  on public.leave_requests
  for each row execute function public.check_leave_request();

-- ---------------------------------------------------------------------------
-- Annonces admin
-- ---------------------------------------------------------------------------

create table if not exists public.admin_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint admin_announcements_title_len check (
    char_length(title) >= 1 and char_length(title) <= 120
  ),
  constraint admin_announcements_body_len check (
    char_length(body) >= 1 and char_length(body) <= 2000
  ),
  constraint admin_announcements_expires_after_created check (
    expires_at > created_at
  )
);

create index if not exists admin_announcements_expires_at_idx
  on public.admin_announcements (expires_at desc);

create index if not exists admin_announcements_created_at_idx
  on public.admin_announcements (created_at desc);

-- ---------------------------------------------------------------------------
-- Push
-- ---------------------------------------------------------------------------

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

create index if not exists push_tokens_updated_at_idx
  on public.push_tokens (updated_at);

create table if not exists public.push_actualite_sent (
  notion_page_id text primary key,
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profil auto à la création user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'practitioner')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_user_created on public.users;
create trigger on_user_created
  after insert on public.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists users_touch on public.users;
create trigger users_touch
  before update on public.users
  for each row execute function public.touch_users_updated_at();
