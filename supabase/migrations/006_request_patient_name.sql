-- IMPLANTOLAB — Migration 006 : nom du patient sur les demandes
--
-- Permet au dentiste de préciser le patient concerné à la création d'une
-- demande. Les vues labo / admin affichent dentiste + patient et permettent
-- une recherche par début de nom.

alter table public.requests
  add column if not exists patient_name text;

comment on column public.requests.patient_name is
  'Nom du patient concerné, saisi par le dentiste à la création de la demande.';

-- Renomme l'ancienne catégorie "Demande" → "Infos complémentaires"
update public.requests
set subject = 'Infos complémentaires'
where subject = 'Demande';

create index if not exists requests_patient_name_lower_idx
  on public.requests (lower(patient_name));
