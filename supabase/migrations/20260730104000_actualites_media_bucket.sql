-- =============================================================================
-- IMPLANTOLAB — Bucket public pour images d'actualités Notion
-- =============================================================================
-- Les fichiers uploadés dans Notion ont des URL signées qui expirent (~1 h).
-- Le site copie ces images vers ce bucket au moment du fetch ISR, puis sert
-- l'URL publique Supabase (permanente) à la place.
--
-- Écriture : uniquement via service_role (bypasse RLS) depuis le serveur Next.
-- Lecture : publique (vitrine).
-- Chemin attendu : articles/{slug}/{hash}.{ext}
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'actualites',
  'actualites',
  true,
  10485760, -- 10 Mo
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Pas de policy SELECT publique : un bucket `public` sert les objets via
-- /storage/v1/object/public/... sans autoriser le listing de tous les fichiers.
-- Pas de policy INSERT/UPDATE/DELETE pour anon/authenticated :
-- seuls les uploads serveur (service_role) écrivent dans ce bucket.
