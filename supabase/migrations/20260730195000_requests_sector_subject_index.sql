-- Index for chef inbox filters (sector + subject + order by created_at).
create index if not exists requests_sector_subject_created_idx
  on public.requests (sector_id, subject, created_at desc);
