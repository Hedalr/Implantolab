-- P2-5 / S10 : index pour purge TTL optionnelle des tokens push stale.
-- Présent dans 001_schema pour installs neuves ; cette migration couvre les DB déjà migrées.

create index if not exists push_tokens_updated_at_idx
  on public.push_tokens (updated_at);
