-- =============================================================================
-- IMPLANTOLAB — Webhooks push (pg_net)
-- Prérequis : secret Vault `push_webhook_secret` (= valeur de PUSH_WEBHOOK_SECRET)
--   select vault.create_secret('<secret>', 'push_webhook_secret', '...');
-- =============================================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.push_webhook_auth_header()
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  limit 1;

  if secret is null or length(secret) = 0 then
    raise exception 'vault secret push_webhook_secret manquant';
  end if;

  return jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || secret
  );
end;
$$;

create or replace function public.push_webhook_on_request()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, net
as $$
begin
  if new.subject is distinct from 'Question'
     and new.subject is distinct from 'Urgence' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://implantolab.vercel.app/api/push/on-request',
    headers := public.push_webhook_auth_header(),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'requests',
      'schema', 'public',
      'record', to_jsonb(new),
      'old_record', null
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

drop trigger if exists push_on_request_insert on public.requests;
create trigger push_on_request_insert
  after insert on public.requests
  for each row
  execute function public.push_webhook_on_request();

create or replace function public.push_webhook_on_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, net
as $$
begin
  perform net.http_post(
    url := 'https://implantolab.vercel.app/api/push/on-message',
    headers := public.push_webhook_auth_header(),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'request_messages',
      'schema', 'public',
      'record', to_jsonb(new),
      'old_record', null
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

drop trigger if exists push_on_message_insert on public.request_messages;
create trigger push_on_message_insert
  after insert on public.request_messages
  for each row
  execute function public.push_webhook_on_message();

revoke all on function public.push_webhook_auth_header() from public, anon, authenticated;
revoke all on function public.push_webhook_on_request() from public, anon, authenticated;
revoke all on function public.push_webhook_on_message() from public, anon, authenticated;
