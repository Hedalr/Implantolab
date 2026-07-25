-- Restrict laboratory users to the only request field exposed by the product:
-- its workflow status. RLS selects the rows; this trigger protects columns.
create or replace function public.protect_request_update_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and not public.is_admin()
     and (to_jsonb(new) - 'status') is distinct from
         (to_jsonb(old) - 'status') then
    raise exception 'request content and ownership are immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all
  on function public.protect_request_update_fields()
  from public, anon, authenticated;

drop trigger if exists protect_request_update_fields
  on public.requests;

create trigger protect_request_update_fields
before update on public.requests
for each row
execute function public.protect_request_update_fields();

comment on function public.protect_request_update_fields() is
  'Allows non-admin authenticated users to update only requests.status.';

-- Keep conflict detection privileged, but never disclose another employee's
-- identity or leave dates through a database error.
create or replace function public.check_leave_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
  v_sector uuid;
  v_used integer;
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
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  select coalesce(sum(days_count), 0)
    into v_used
    from public.leave_requests
   where profile_id = new.profile_id
     and status in ('pending', 'approved')
     and (tg_op = 'INSERT' or id <> new.id);

  if v_used + v_days > v_balance then
    raise exception 'INSUFFICIENT_BALANCE: solde restant %',
      greatest(v_balance - v_used, 0)
      using errcode = 'P0001';
  end if;

  if v_sector is not null then
    perform 1
      from public.leave_requests lr
      join public.profiles p on p.id = lr.profile_id
     where p.sector_id = v_sector
       and lr.profile_id <> new.profile_id
       and lr.status in ('pending', 'approved')
       and (tg_op = 'INSERT' or lr.id <> new.id)
       and lr.start_date <= new.end_date
       and lr.end_date >= new.start_date
     limit 1;

    if found then
      raise exception 'SECTOR_CONFLICT' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all
  on function public.check_leave_request()
  from public, anon, authenticated;

comment on function public.check_leave_request() is
  'Validates leave balance and sector conflicts without exposing colleague data.';

-- Repair bucket visibility if either bucket was changed manually. The retired
-- case-media bucket is kept private pending an explicit retention decision.
update storage.buckets
   set public = false
 where id in ('request-media', 'case-media');

-- Enforce upload restrictions in Storage itself. Browser clients can no longer
-- bypass the Server Action's MIME and size validation with a direct upload.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array[
         'image/jpeg',
         'image/png',
         'image/webp',
         'image/heic',
         'image/heif'
       ]::text[]
 where id = 'request-media';

drop policy if exists "request_media_storage_insert_own"
  on storage.objects;

-- Bound request and media creation by practice. The advisory lock makes the
-- check atomic when several submissions arrive concurrently.
create index if not exists requests_practice_created_at_idx
  on public.requests (practice_id, created_at desc);

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
      pg_catalog.hashtextextended(new.practice_id::text, 0)
    );

    if (
      select pg_catalog.count(*) >= 5
        from public.requests
       where practice_id = new.practice_id
         and created_at >= pg_catalog.now() - interval '15 minutes'
    ) then
      raise exception 'REQUEST_RATE_LIMIT' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all
  on function public.enforce_request_creation_rate_limit()
  from public, anon, authenticated;

drop trigger if exists enforce_request_creation_rate_limit
  on public.requests;

create trigger enforce_request_creation_rate_limit
before insert on public.requests
for each row
execute function public.enforce_request_creation_rate_limit();

comment on function public.enforce_request_creation_rate_limit() is
  'Limits each practice to five new requests per rolling 15-minute window.';
