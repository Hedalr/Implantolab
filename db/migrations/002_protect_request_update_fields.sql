-- Defense-in-depth (P2-3 / S6) : seul `status` est mutable sur public.requests.
-- Présent dans 001_schema pour les installs neuves ; cette migration couvre
-- les DB déjà migrées. Miroir du trigger Supabase (adapté sans is_admin()).

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
