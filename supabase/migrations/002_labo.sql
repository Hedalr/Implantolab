-- =============================================================================
-- IMPLANTOLAB — Module Laboratoire (dossiers patient WhatsApp → prothésistes)
-- =============================================================================
-- Cette migration ajoute :
--   1. Un nouveau rôle applicatif : `prosthetist` (prothésiste).
--   2. Un répertoire de contacts dentistes (`dentist_contacts`) indexé par
--      numéro WhatsApp E.164.
--   3. Les dossiers patient (`patient_cases`), un dossier par cas clinique.
--   4. Les messages WhatsApp bruts liés à un dossier (`case_messages`).
--   5. Les pièces jointes (`case_media`) stockées dans un bucket privé
--      `case-media` de Supabase Storage.
--   6. Les policies RLS et le bucket Storage associés.
--
-- L'ingestion est effectuée par le webhook /api/whatsapp/webhook côté Next.js
-- avec la clé service_role. Les policies RLS ne concernent donc que les accès
-- authentifiés depuis le back-office (`admin` + `prosthetist`).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Rôle applicatif prothésiste
-- -----------------------------------------------------------------------------

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('practitioner', 'admin', 'prosthetist'));

comment on column public.profiles.role is
  'Rôle applicatif : practitioner (dentiste avec compte site), admin (Antoine), prosthetist (prothésiste du labo).';

-- Un prothésiste n'appartient à aucun cabinet — on lâche la contrainte
-- implicite en documentant la nullabilité de practice_id (déjà en place).

create or replace function public.is_labo_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role in ('admin', 'prosthetist')
      from public.profiles
      where id = auth.uid()
    ),
    false
  )
$$;

comment on function public.is_labo_staff() is
  'True si l''utilisateur courant est admin ou prothésiste. Utilisé par les policies du module labo.';

-- -----------------------------------------------------------------------------
-- 2. Répertoire dentistes
-- -----------------------------------------------------------------------------

create table if not exists public.dentist_contacts (
  id uuid primary key default gen_random_uuid(),
  whatsapp_phone_e164 text not null unique,
  full_name text,
  practice_id uuid references public.practices(id) on delete set null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dentist_contacts_phone_e164_format
    check (whatsapp_phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);

comment on table public.dentist_contacts is
  'Répertoire des dentistes contactant le laboratoire par WhatsApp, indexé par numéro E.164.';

create index if not exists dentist_contacts_practice_idx
  on public.dentist_contacts (practice_id);

-- -----------------------------------------------------------------------------
-- 3. Dossiers patient
-- -----------------------------------------------------------------------------

create sequence if not exists public.patient_case_seq;

create or replace function public.next_case_number()
returns text
language sql
volatile
as $$
  select 'CAS-'
    || to_char(now(), 'YYYY')
    || '-'
    || lpad(nextval('public.patient_case_seq')::text, 5, '0')
$$;

comment on function public.next_case_number() is
  'Génère un identifiant humain type CAS-2026-00042 pour les dossiers patient.';

do $$ begin
  create type public.case_status as enum (
    'pending_review',
    'received',
    'in_progress',
    'waiting_info',
    'completed',
    'delivered',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.case_priority as enum ('low', 'normal', 'high', 'urgent');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.patient_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default public.next_case_number(),
  patient_name text,
  patient_name_confidence numeric(3, 2),
  dentist_contact_id uuid references public.dentist_contacts(id) on delete set null,
  dentist_name_raw text,
  dentist_phone_e164 text,
  work_type text,
  description text,
  status public.case_status not null default 'pending_review',
  priority public.case_priority not null default 'normal',
  assigned_prosthetist_id uuid references public.profiles(id) on delete set null,
  needs_review boolean not null default true,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.patient_cases is
  'Dossier patient centralisant les messages et pièces jointes reçus du dentiste via WhatsApp.';

create index if not exists patient_cases_status_idx
  on public.patient_cases (status);

create index if not exists patient_cases_dentist_phone_idx
  on public.patient_cases (dentist_phone_e164);

create index if not exists patient_cases_dentist_contact_idx
  on public.patient_cases (dentist_contact_id);

create index if not exists patient_cases_assigned_idx
  on public.patient_cases (assigned_prosthetist_id);

create index if not exists patient_cases_needs_review_idx
  on public.patient_cases (needs_review)
  where needs_review = true;

create index if not exists patient_cases_last_message_idx
  on public.patient_cases (last_message_at desc);

-- Recherche full-text simple sur patient + dentiste + description
create index if not exists patient_cases_search_idx
  on public.patient_cases
  using gin (
    to_tsvector(
      'french',
      coalesce(patient_name, '') || ' '
      || coalesce(dentist_name_raw, '') || ' '
      || coalesce(work_type, '') || ' '
      || coalesce(description, '')
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Messages WhatsApp bruts
-- -----------------------------------------------------------------------------

do $$ begin
  create type public.message_direction as enum ('inbound', 'outbound');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.patient_cases(id) on delete cascade,
  whatsapp_message_id text unique,
  direction public.message_direction not null default 'inbound',
  sender_phone_e164 text,
  body text,
  raw_payload jsonb,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.case_messages is
  'Messages WhatsApp (texte, légendes photo, réponses labo) associés à un dossier.';

create index if not exists case_messages_case_idx
  on public.case_messages (case_id, received_at desc);

-- -----------------------------------------------------------------------------
-- 5. Pièces jointes (photos, PDF, vocaux)
-- -----------------------------------------------------------------------------

create table if not exists public.case_media (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.patient_cases(id) on delete cascade,
  message_id uuid references public.case_messages(id) on delete set null,
  storage_bucket text not null default 'case-media',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  whatsapp_media_id text,
  original_filename text,
  caption text,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

comment on table public.case_media is
  'Pièces jointes stockées dans Supabase Storage (photos, PDF, vocaux). Accès via signed URLs générées côté serveur.';

create index if not exists case_media_case_idx
  on public.case_media (case_id, created_at desc);

create index if not exists case_media_whatsapp_media_idx
  on public.case_media (whatsapp_media_id);

-- -----------------------------------------------------------------------------
-- 6. Trigger updated_at
-- -----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists patient_cases_touch on public.patient_cases;
create trigger patient_cases_touch
  before update on public.patient_cases
  for each row execute function public.touch_updated_at();

drop trigger if exists dentist_contacts_touch on public.dentist_contacts;
create trigger dentist_contacts_touch
  before update on public.dentist_contacts
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.dentist_contacts enable row level security;
alter table public.patient_cases enable row level security;
alter table public.case_messages enable row level security;
alter table public.case_media enable row level security;

-- ---- dentist_contacts -------------------------------------------------------

drop policy if exists "dentist_contacts_all_labo" on public.dentist_contacts;
create policy "dentist_contacts_all_labo"
  on public.dentist_contacts
  for all
  to authenticated
  using (public.is_labo_staff())
  with check (public.is_labo_staff());

-- ---- patient_cases ----------------------------------------------------------

drop policy if exists "patient_cases_select_labo" on public.patient_cases;
create policy "patient_cases_select_labo"
  on public.patient_cases
  for select
  to authenticated
  using (public.is_labo_staff());

drop policy if exists "patient_cases_write_labo" on public.patient_cases;
create policy "patient_cases_write_labo"
  on public.patient_cases
  for all
  to authenticated
  using (public.is_labo_staff())
  with check (public.is_labo_staff());

-- ---- case_messages ----------------------------------------------------------

drop policy if exists "case_messages_all_labo" on public.case_messages;
create policy "case_messages_all_labo"
  on public.case_messages
  for all
  to authenticated
  using (public.is_labo_staff())
  with check (public.is_labo_staff());

-- ---- case_media -------------------------------------------------------------

drop policy if exists "case_media_all_labo" on public.case_media;
create policy "case_media_all_labo"
  on public.case_media
  for all
  to authenticated
  using (public.is_labo_staff())
  with check (public.is_labo_staff());

-- =============================================================================
-- Storage — bucket privé `case-media`
-- =============================================================================
-- Le bucket est privé : les uploads sont faits depuis le webhook avec la clé
-- service_role (bypass RLS), les téléchargements passent par une signed URL
-- générée par /api/case-media/[id] qui vérifie l'auth.

insert into storage.buckets (id, name, public)
values ('case-media', 'case-media', false)
on conflict (id) do nothing;

-- Accès en lecture pour le personnel labo (utile si un jour on servait
-- directement depuis le client ; aujourd'hui on passe par signed URLs).
drop policy if exists "case_media_storage_read_labo" on storage.objects;
create policy "case_media_storage_read_labo"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'case-media'
    and public.is_labo_staff()
  );

-- =============================================================================
-- Fin de la migration 002_labo
-- =============================================================================
