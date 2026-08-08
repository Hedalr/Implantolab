# Scalingo HDS — préparation & cutover

## État actuel

| Environnement | Backend | Notes |
|---|---|---|
| Prod / test | **Supabase** (`DATA_BACKEND=supabase`) | Intact jusqu’au cutover |
| Dev local | Docker Postgres (`DATA_BACKEND=postgres`) | `docker compose up -d` |
| Futur prod | Scalingo Postgres **HDS** | Même code, nouvelle app HDS |

## Schéma Postgres (audit)

`db/migrations/001_schema.sql` **couvre le Postgres métier Supabase actuel**  
(profiles, sectors, requests, médias, messages, congés, fermetures, annonces, push…).

Volontairement **hors** schéma Docker : Auth/Storage/Realtime/RLS/`pg_net` Supabase  
→ remplacés par `users`/`sessions`, fichiers locaux, guards app, polling, code push/email.

Tables obsolètes non portées : `practices`, `patient_cases`, `case_*`, `dentist_contacts`.

Checklist détaillée (1 chat = 1 case) : Notion **To do Scalingo HDS — migration**.

## UI migrée (dual-mode, sans toucher la prod)

| Surface | Mode postgres | Notes |
|---|---|---|
| Auth web / mobile | OK | Cookie + bearer |
| Web `/espace-praticien/demandes` | OK | List + create + médias + chat polling |
| Mobile praticien demandes | OK | List + create + détail + chat polling |
| Web `/espace-praticien/laboratoire` | OK | Liste secteurs, statut open/closed, détail + médias |
| Mobile labo (admin / chef / prothésiste) | OK | Liste + détail + médias + PATCH statut |
| Web admin `/espace-praticien/admin/demandes` | OK | Liste filtrée Q/Urgence, statut, chat polling |
| Mobile admin / chef demandes Q/Urgence | OK | Liste + PATCH statut + détail/chat API |
| Web admin modifications-prothèse | OK | Liste + médias + statut ; email Resend app-side |
| Mobile admin modifications | OK | Liste + détail + médias + PATCH statut |
| Web congés (`/conges` + admin validation) | OK | CRUD leave_requests + approve/reject ; trigger `check_leave_request` |
| Mobile congés chef / prothésiste | OK | List / create / cancel via `/api/v1/leave-requests` |
| Web fermetures praticien + admin calendrier | OK | CRUD `closure_periods` ; calendrier lecture admin |
| Mobile praticien fermetures | OK | List / create / delete via `/api/v1/closure-periods` |
| Web admin annonces | OK | Create / delete `admin_announcements` ; liste actives + expirées |
| Mobile praticien annonces | OK | Lecture non expirées via `/api/v1/announcements` |
| Web admin RH (employés / praticiens) | OK | Secteurs, profils, soft-delete, invites + set-password postgres |
| Dashboard admin `/espace-praticien/admin` | OK | KPI + listes dual-mode ; `GET /api/v1/admin/dashboard` |

API v1 (postgres only) : `/auth/*` (login, logout, accept-invite, set-password), `/me`, `/sectors`, `/requests`, `/requests/[id]` (GET+PATCH statut), `/messages`, `/media`, `/leave-requests`, `/leave-requests/[id]` (PATCH review admin + DELETE), `/closure-periods`, `/closure-periods/[id]` (DELETE), `/announcements`, `/announcements/[id]` (DELETE), `/rh/sectors`, `/rh/sectors/[id]`, `/rh/users`, `/rh/users/[id]`, `/admin/dashboard`, `/push/register`.

Smoke global local : `node scripts/smoke-m9-global.mjs` (prérequis Docker + seed + `npm run dev`).

## Variables d’environnement (postgres)

```bash
DATA_BACKEND=postgres
DATABASE_URL=postgresql://...          # obligatoire en prod (fail-closed)
NEXT_PUBLIC_SITE_URL=https://….osc-fr1.scalingo.io   # ou domaine custom
# ↑ Requis pour redirects auth / e-mails si le Host interne (localhost:$PORT) fuit
LOCAL_STORAGE_ROOT=/app/.data/storage   # ou stockage objet plus tard
# Symlinks sous ce root : refusés (fail-closed) — voir lib/storage/local.ts
CRON_SECRET=...
# + Resend / Notion / etc. déjà utilisés
```

Sécurité dual-mode (audit S1) :

- `DATA_BACKEND` invalide → throw en production
- Sans `DATABASE_URL` hors dev/test → throw (pas de défaut Docker en prod)
- URL Docker locale (`localhost` / `implantolab:implantolab`) refusée si `NODE_ENV=production`
- `getServerSupabase()` désactivé quand `DATA_BACKEND=postgres` (évite chemin Supabase accidentel)
- `/api/v1/*` renvoie `503 postgres_backend_required` si backend ≠ postgres

Mobile :

```bash
EXPO_PUBLIC_DATA_BACKEND=postgres
EXPO_PUBLIC_API_URL=https://votre-domaine.fr
```

## Commandes DB

```bash
npm run db:migrate
npm run db:seed          # fictif local uniquement
npm run db:dump          # export schema+data
npm run db:restore       # import depuis dump
```

## Deploy Scalingo (non-HDS sandbox ou HDS)

1. Créer l’app (cocher HDS **uniquement** pour la prod client).
2. Addon Postgres (Business+ si HDS).
3. `scalingo git:remote` + push, ou GitHub deploy.
4. Définir les env ci-dessus.
5. `scalingo run npm run db:migrate`

HDS : on ne convertit pas une app non-HDS — on **recrée** une app HDS et on redéploie le même code + dump/restore.

## Cutover (Phase 6 — plus tard)

Conditions : App Store live + domaine réel.

1. Compte client Scalingo → app HDS + Postgres Business HDS
2. `db:migrate` + restore données (si migration depuis Supabase)
3. DNS → Scalingo, `DATA_BACKEND=postgres`
4. Build mobile `EXPO_PUBLIC_API_URL` + `EXPO_PUBLIC_DATA_BACKEND=postgres`
5. Validation smoke (login, demande, chat, push, médias)
6. Freeze / décommission Supabase après validation

## Données de santé

Aucun patient réel hors environnement **HDS**. Seed local = comptes fictifs uniquement.
