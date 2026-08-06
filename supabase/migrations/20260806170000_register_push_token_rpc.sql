-- =============================================================================
-- IMPLANTOLAB — register_push_token (reclaim device token across accounts)
-- Upsert client RLS fails when the same Expo token already belongs to another
-- profile (USING on UPDATE). A SECURITY DEFINER RPC reassigns to auth.uid().
-- =============================================================================

create or replace function public.register_push_token(
  p_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'token required';
  end if;

  if p_platform is distinct from 'ios' and p_platform is distinct from 'android' then
    raise exception 'invalid platform';
  end if;

  insert into public.push_tokens (profile_id, token, platform, updated_at)
  values (auth.uid(), trim(p_token), p_platform, now())
  on conflict (token) do update
    set profile_id = auth.uid(),
        platform = excluded.platform,
        updated_at = now();
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

comment on function public.register_push_token(text, text) is
  'Enregistre ou réassigne un jeton Expo Push au profil auth.uid() (app mobile).';
