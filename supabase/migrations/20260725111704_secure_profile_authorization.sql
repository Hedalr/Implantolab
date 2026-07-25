-- A user may edit their display name, but authorization and tenant fields are
-- controlled exclusively by administrators and trusted backend roles.
create or replace function public.protect_profile_authorization_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and not public.is_admin()
     and (to_jsonb(new) - 'full_name') is distinct from
         (to_jsonb(old) - 'full_name') then
    raise exception 'profile authorization fields are admin-only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all
  on function public.protect_profile_authorization_fields()
  from public, anon, authenticated;

drop trigger if exists protect_profile_authorization_fields
  on public.profiles;

create trigger protect_profile_authorization_fields
before update on public.profiles
for each row
execute function public.protect_profile_authorization_fields();

comment on function public.protect_profile_authorization_fields() is
  'Prevents non-admin authenticated users from changing profile authorization, tenant, balance, or audit fields.';
