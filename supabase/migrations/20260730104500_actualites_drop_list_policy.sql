-- =============================================================================
-- Retire la policy SELECT trop large sur le bucket public `actualites`
-- (évite le listing de tous les fichiers ; les URL publiques restent accessibles).
-- =============================================================================

drop policy if exists "actualites_public_read" on storage.objects;
