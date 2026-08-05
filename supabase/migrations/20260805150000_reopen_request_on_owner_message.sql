-- Auto-reopen Question/Urgence when the owner dentist sends a message.

create or replace function public.can_reply_to_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_access_request(p_request_id)
    and exists (
      select 1
      from public.requests r
      where r.id = p_request_id
        and r.subject in ('Question', 'Urgence')
        and (
          r.status = 'open'
          or (
            r.status = 'closed'
            and r.profile_id = auth.uid()
          )
        )
    )
$$;

comment on function public.can_reply_to_request(uuid) is
  'True if the user can post (open request, or closed request owned by the dentist).';

create or replace function public.reopen_request_on_owner_message()
returns trigger
language plpgsql
security definer
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

comment on function public.reopen_request_on_owner_message() is
  'Reopens a closed request when the owner dentist sends a message.';

drop trigger if exists reopen_request_on_owner_message on public.request_messages;
create trigger reopen_request_on_owner_message
  after insert on public.request_messages
  for each row
  execute function public.reopen_request_on_owner_message();
