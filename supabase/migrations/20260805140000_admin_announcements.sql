-- =============================================================================
-- IMPLANTOLAB — Annonces admin → praticiens (push + lecture temporaire)
-- =============================================================================

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

comment on table public.admin_announcements is
  'Messages diffusés par l''admin à tous les praticiens (push + lecture jusqu''à expires_at).';

alter table public.admin_announcements enable row level security;

drop policy if exists "admin_announcements_select_admin" on public.admin_announcements;
create policy "admin_announcements_select_admin"
  on public.admin_announcements
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_announcements_select_practitioner" on public.admin_announcements;
create policy "admin_announcements_select_practitioner"
  on public.admin_announcements
  for select
  to authenticated
  using (
    expires_at > now()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'practitioner'
        and p.deleted_at is null
    )
  );

drop policy if exists "admin_announcements_insert_admin" on public.admin_announcements;
create policy "admin_announcements_insert_admin"
  on public.admin_announcements
  for insert
  to authenticated
  with check (
    public.is_admin()
    and created_by = auth.uid()
  );

drop policy if exists "admin_announcements_delete_admin" on public.admin_announcements;
create policy "admin_announcements_delete_admin"
  on public.admin_announcements
  for delete
  to authenticated
  using (public.is_admin());
