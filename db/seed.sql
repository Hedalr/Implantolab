-- =============================================================================
-- Seed local fictif — AUCUNE donnée de santé réelle
-- Mots de passe hashés côté Node (db/seed.mjs) avant insertion.
-- Ce fichier n'est pas exécuté seul : utiliser `npm run db:seed`.
-- =============================================================================

-- Secteurs labo
insert into public.sectors (id, name, color)
values
  ('11111111-1111-1111-1111-111111111101', 'Numérique', '#2B6CB0'),
  ('11111111-1111-1111-1111-111111111102', 'Amovible', '#C05621'),
  ('11111111-1111-1111-1111-111111111103', 'Conjoint', '#2F855A')
on conflict (name) do nothing;
