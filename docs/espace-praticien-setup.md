# Espace praticien — Guide de mise en service

Ce guide explique comment activer l’espace praticien du site IMPLANTOLAB
(section `/espace-praticien`) en configurant un projet Supabase et en
créant les premiers accès.

Tant qu’aucune variable d’environnement Supabase n’est renseignée, la
page `/espace-praticien/login` affiche un message d’attente de
configuration et le reste de la section est protégé par le middleware.

## 1. Créer un projet Supabase

1. Rendez-vous sur [https://supabase.com](https://supabase.com) et créez
   un compte (ou connectez-vous).
2. Cliquez sur **New project**, choisissez une organisation, un nom
   (par exemple `implantolab-praticien`), un mot de passe pour la base
   Postgres, et une région européenne (par ex. **Frankfurt**).
3. Attendez la fin du provisioning (~2 min).

## 2. Récupérer les clés API

1. Dans le dashboard Supabase, ouvrez **Project Settings → API**.
2. Notez les valeurs :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (Optionnel) **service_role** → `SUPABASE_SERVICE_ROLE_KEY`
     (à ne JAMAIS exposer côté client, réservé aux scripts admin).

## 3. Renseigner `.env.local`

À la racine du dépôt, dupliquez `.env.local.example` en `.env.local` puis
remplissez les variables ci-dessus. Redémarrez le serveur de dev
(`npm run dev`) après modification.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # optionnel
```

En production (Vercel), ces variables se déclarent dans
**Project Settings → Environment Variables**.

## 4. Appliquer la migration SQL

La migration `supabase/migrations/001_init.sql` crée les 4 tables
(`practices`, `profiles`, `closure_periods`, `requests`), active RLS et
définit les policies.

### Option A — SQL Editor du dashboard (rapide)

1. Ouvrez **SQL Editor → New query**.
2. Collez l’intégralité du fichier `supabase/migrations/001_init.sql`.
3. Cliquez sur **Run**. Vérifiez qu’il n’y a pas d’erreur.

### Option B — Supabase CLI (recommandé long terme)

```bash
npm install -g supabase        # si pas déjà installé
supabase login
supabase link --project-ref <votre-ref>   # ref visible dans l'URL du dashboard
supabase db push
```

## 4-bis. Configurer les URL d’auth Supabase (indispensable pour les invitations)

Sans cette étape, le lien de l’e-mail d’invitation ne redirige pas vers
votre site et le collaborateur ne peut pas définir son mot de passe.

Dans le dashboard Supabase → **Authentication → URL Configuration** :

- **Site URL** : URL principale de votre site.
  - Dev : `http://localhost:3000`
  - Prod : `https://www.implantolab.fr`
- **Redirect URLs** (liste blanche) : ajouter les patterns autorisés :
  - `http://localhost:3000/**`
  - `https://www.implantolab.fr/**`
  - Toute preview Vercel (ex. `https://implantolab-*.vercel.app/**`).

En parallèle, dans **Authentication → Email Templates → Invite user**, le
template par défaut de Supabase utilise `{{ .ConfirmationURL }}` qui pointe
sur `/auth/v1/verify?...&type=invite` puis suit le `redirect_to` transmis
par le code — pas besoin d’y toucher sauf pour personnaliser le style.

**Important** : si la **Site URL** Supabase pointe encore vers
`http://localhost:3000`, les liens d’invitation renverront vers votre machine
locale même quand l’invitation est envoyée depuis Vercel. En production, mettez
la **Site URL** sur `https://implantolab.vercel.app` (ou votre domaine final).

## 5. Créer les cabinets et inviter les praticiens

### Depuis le site (recommandé)

1. Connectez-vous en **admin** sur `/espace-praticien/login`.
2. Ouvrez **Praticiens** dans le menu admin (`/espace-praticien/admin/praticiens`).
3. **Créez le cabinet** (nom + ville).
4. **Invitez l’utilisateur** par e-mail. Deux types disponibles :
   - **Praticien (dentiste)** : rattaché à un cabinet, accès à ses fermetures
     et demandes.
   - **Prothésiste (collaborateur labo)** : accès au module Laboratoire
     (dossiers patient WhatsApp). Aucun cabinet à sélectionner.
5. L’utilisateur reçoit un lien « You've been invited ». En cliquant, il
   arrive sur `/espace-praticien/set-password` où il choisit son mot de
   passe, puis est automatiquement redirigé vers son espace selon son
   rôle.

Pour les invitations par e-mail, ajoutez `SUPABASE_SERVICE_ROLE_KEY` dans
`.env.local` (local) ou Vercel (production). Récupérez-la dans Supabase →
Project Settings → API → **service_role** (secret, jamais côté client).

En production, renseignez aussi `NEXT_PUBLIC_SITE_URL` (ex.
`https://www.implantolab.fr`) pour que les liens d’invitation pointent vers
le bon domaine.

### Depuis le dashboard Supabase (alternative)

Dans **Table Editor → practices**, ajoutez une ligne par cabinet
partenaire :

- `name` : « Cabinet Dr. Dupont »
- `city` : « Blois »

Notez l’`id` (uuid) généré — il servira à rattacher les praticiens.

## 6. Inviter les utilisateurs

1. Allez dans **Authentication → Users → Invite user**.
2. Saisissez l’email du praticien (ou d’un admin du laboratoire) et
   envoyez l’invitation.
3. L’utilisateur reçoit un email pour définir son mot de passe.

Alternative : cliquez sur **Add user** et créez directement un compte
avec un mot de passe (pratique pour un compte admin de test).

## 7. Rattacher le profil au cabinet

À la création d’un utilisateur, un trigger crée automatiquement une
ligne `profiles` avec `role = 'practitioner'` et `practice_id = NULL`.

Dans **Table Editor → profiles**, éditez cette ligne :

- `practice_id` : coller l’`id` du cabinet créé à l’étape 5.
- `full_name` : « Dr. Jean Dupont » (facultatif mais recommandé).
- `role` :
  - `practitioner` pour un compte cabinet (défaut).
  - `admin` pour un compte laboratoire (voit toutes les fermetures
    et toutes les demandes, peut gérer les praticiens).

Un compte admin doit **quand même** avoir un `practice_id` s’il doit
créer des fermetures pour son propre cabinet ; sinon on peut laisser
`NULL` (il aura accès en lecture à tout via les policies RLS).

## 8. Se connecter

Rendez-vous sur `/espace-praticien/login`, entrez l’email et le mot de
passe.

- Un utilisateur `practitioner` est redirigé vers
  `/espace-praticien/fermetures`.
- Un utilisateur `admin` est redirigé vers `/espace-praticien/admin`.

## Dépannage

- **« L’espace praticien n’est pas encore configuré »** → les variables
  d’environnement `NEXT_PUBLIC_SUPABASE_URL` ou
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont manquantes ou vides.
  Vérifiez `.env.local` (local) ou Vercel (prod), puis redéployez.
- **« Identifiants incorrects »** → mot de passe erroné, ou l’email
  n’existe pas dans Supabase Auth. Vérifiez dans
  **Authentication → Users**.
- **L’invité clique sur le lien mais atterrit sur une page vide, une
  erreur ou l’URL Supabase brute** → la **Site URL** ou la liste des
  **Redirect URLs** dans **Authentication → URL Configuration** ne
  contient pas votre domaine (`http://localhost:3000/**` ou
  `https://www.implantolab.fr/**`). Corrigez et renvoyez une invitation.
- **L’invité définit son mot de passe puis « invalid credentials » à la
  reconnexion** → l’ancienne invitation ne passait pas par
  `/espace-praticien/set-password`. Renvoyez une nouvelle invitation
  depuis l’espace admin ; le nouveau flux force le passage sur la page
  de définition du mot de passe.
- **Redirection en boucle vers `/login`** → l’utilisateur est bien
  authentifié dans Supabase mais son profil `profiles` n’existe pas
  ou n’est pas accessible (trigger `handle_new_user` désactivé, ou
  RLS mal appliquée). Vérifiez la présence de la ligne
  `profiles.id = <auth uid>`.
- **« Row Level Security prevents this operation »** dans les logs → le
  `practice_id` du profil n’est pas renseigné, ou l’utilisateur essaie
  d’accéder à un cabinet qui n’est pas le sien. Vérifiez l’étape 7.
