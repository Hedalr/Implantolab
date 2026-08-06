-- =============================================================================
-- IMPLANTOLAB — Webhook email Modifications prothèse (pg_net)
-- Même secret Vault `push_webhook_secret` que les webhooks push.
-- Déclenché sur INSERT requests (web + mobile) pour sujet "Modifications prothèse".
-- Activer seulement après déploiement de /api/prothese/on-request.
-- =============================================================================

create or replace function public.prothese_email_webhook_on_request()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, net
as $$
begin
  if new.subject is distinct from 'Modifications prothèse' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://implantolab.vercel.app/api/prothese/on-request',
    headers := public.push_webhook_auth_header(),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'requests',
      'schema', 'public',
      'record', to_jsonb(new),
      'old_record', null
    ),
    timeout_milliseconds := 10000
  );

  return new;
end;
$$;

drop trigger if exists prothese_email_on_request_insert on public.requests;
create trigger prothese_email_on_request_insert
  after insert on public.requests
  for each row
  execute function public.prothese_email_webhook_on_request();

revoke all on function public.prothese_email_webhook_on_request() from public, anon, authenticated;
