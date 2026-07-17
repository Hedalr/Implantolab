-- =============================================================================
-- IMPLANTOLAB — Validation admin des demandes de congés
-- =============================================================================
-- Ajoute un statut sur leave_requests :
--   pending  → en attente de validation admin (défaut à la création)
--   approved → confirmé par l'admin (compte dans le solde et les conflits)
--   rejected → refusé par l'admin (n'occupe plus le solde ni le créneau)
--
-- Les demandes existantes sont marquées approved (elles étaient déjà effectives).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colonnes de statut / revue
-- -----------------------------------------------------------------------------

alter table public.leave_requests
  add column if not exists status text not null default 'pending';

alter table public.leave_requests
  drop constraint if exists leave_requests_status_check;

alter table public.leave_requests
  add constraint leave_requests_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.leave_requests
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

alter table public.leave_requests
  add column if not exists reviewed_at timestamptz;

comment on column public.leave_requests.status is
  'pending = en attente admin ; approved = confirmé ; rejected = refusé.';

comment on column public.leave_requests.reviewed_by is
  'Admin ayant approuvé ou refusé la demande.';

comment on column public.leave_requests.reviewed_at is
  'Horodatage de la décision admin.';

-- Demandes déjà posées avant cette migration : considérées comme approuvées
update public.leave_requests
   set status = 'approved'
 where status = 'pending'
   and reviewed_at is null;

-- Index pour les files d'attente admin
create index if not exists leave_requests_status_idx
  on public.leave_requests (status);

-- -----------------------------------------------------------------------------
-- 2. Trigger : solde + conflits sur pending/approved uniquement
-- -----------------------------------------------------------------------------

create or replace function public.check_leave_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_sector uuid;
  v_used integer;
  v_conflict record;
  v_days integer;
begin
  -- Toute création employé démarre en attente
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;

  -- Les refus ne consomment ni solde ni créneau
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

  -- Solde : pending + approved (les demandes en suspens réservent le solde)
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

  -- Conflit secteur : pending + approved d'un collègue
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

comment on function public.check_leave_request() is
  'Trigger BEFORE INSERT/UPDATE sur leave_requests : force pending à la création, vérifie solde et conflits sur pending/approved.';

drop trigger if exists leave_requests_check on public.leave_requests;
create trigger leave_requests_check
  before insert or update of start_date, end_date, days_count, status, profile_id
  on public.leave_requests
  for each row execute function public.check_leave_request();

-- -----------------------------------------------------------------------------
-- 3. RLS : update admin + delete employé limité au pending/rejected
-- -----------------------------------------------------------------------------

drop policy if exists "leave_requests_update_admin" on public.leave_requests;
create policy "leave_requests_update_admin"
  on public.leave_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "leave_requests_delete_self_or_admin" on public.leave_requests;
create policy "leave_requests_delete_self_or_admin"
  on public.leave_requests
  for delete
  to authenticated
  using (
    public.is_admin()
    or (
      profile_id = auth.uid()
      and status in ('pending', 'rejected')
    )
  );
