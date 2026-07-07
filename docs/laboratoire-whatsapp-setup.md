# Module Laboratoire — Ingestion WhatsApp

Ce document explique comment configurer et exploiter le module *Laboratoire*
qui automatise la création des dossiers patient à partir des messages
WhatsApp reçus par le laboratoire.

## Vue d'ensemble

1. Un dentiste envoie une photo et un message au **numéro WhatsApp Business
   dédié** au labo.
2. Meta transmet le webhook à `/api/whatsapp/webhook`.
3. Le serveur vérifie la signature HMAC-SHA256 puis :
   - télécharge chaque média via la Graph API,
   - extrait patient / dentiste / type de travail via un LLM (OpenAI ou
     Anthropic),
   - crée un nouveau dossier ou complète le dossier ouvert récent pour ce
     numéro (fenêtre de 30 min),
   - stocke les photos dans le bucket privé `case-media`,
   - envoie une notification Slack.
4. Les prothésistes se connectent sur `/espace-praticien/laboratoire`,
   trouvent le dossier, ouvrent les photos et travaillent.

## Prérequis

- Un **numéro de téléphone dédié** (mobile ou virtuel) — ce numéro ne peut
  pas être présent dans l'app WhatsApp après migration vers l'API.
- Un compte **Meta for Developers** (https://developers.facebook.com) avec :
  - une App type "Business",
  - le produit **WhatsApp Business Platform** ajouté,
  - un WhatsApp Business Account (WABA) rattaché.
- Un projet **Supabase** avec la migration `002_labo.sql` appliquée.
- Une clé LLM (**OpenAI** ou **Anthropic**) — sans clé, les dossiers sont
  créés en `pending_review` avec extraction vide.
- Optionnel : un **Incoming Webhook Slack** pour les notifications.

## Étapes de configuration

### 1. Base de données

Depuis le dashboard Supabase → SQL Editor, exécuter :

```sql
-- fichier fourni dans supabase/migrations/002_labo.sql
```

Ou via la CLI :

```bash
supabase db push
```

Cela crée :

- Le rôle applicatif `prosthetist`.
- Les tables `dentist_contacts`, `patient_cases`, `case_messages`, `case_media`.
- Le bucket Storage privé `case-media`.
- Les policies RLS `admin` + `prosthetist`.

### 2. Créer un prothésiste

Depuis `/espace-praticien/admin/praticiens` → panneau **Inviter un
utilisateur** :

1. Cocher **Prothésiste (collaborateur labo)**.
2. Saisir e-mail + nom complet (aucun cabinet à sélectionner).
3. Envoyer l’invitation.

Le prothésiste reçoit un e-mail « You've been invited » ; en cliquant le
lien, il arrive sur `/espace-praticien/set-password` pour choisir son mot
de passe, puis est automatiquement redirigé vers
`/espace-praticien/laboratoire`.

### 3. Meta App + WhatsApp Business

Dans **App Dashboard → WhatsApp → API Setup** :

1. Ajouter le numéro business du labo.
2. Créer un **System User** dans Business Manager et générer un **access
   token permanent** avec les permissions :
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
3. Récupérer le **Phone number ID** dans la même page.

Dans **App Dashboard → Settings → Basic** :

- Copier le **App Secret**.

Dans **App Dashboard → WhatsApp → Configuration → Webhook** :

- Callback URL : `https://<votre-site>/api/whatsapp/webhook`
- Verify token : la valeur choisie pour `WHATSAPP_VERIFY_TOKEN`
- S'abonner au champ **messages**.

### 4. Variables d'environnement

Compléter `.env.local` avec :

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # requis pour le webhook

WHATSAPP_VERIFY_TOKEN=implantolab-verify-xxxx
WHATSAPP_APP_SECRET=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=v21.0

OPENAI_API_KEY=sk-...                # OU ANTHROPIC_API_KEY=sk-ant-...
OPENAI_MODEL=gpt-4o-mini

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

En production Vercel, définir ces variables dans **Project Settings →
Environment Variables**.

### 5. Tester sans WhatsApp réel

Un endpoint `POST /api/whatsapp/mock` accepte un payload simulé (accessible
uniquement aux admins connectés) :

```bash
curl -X POST https://<site>/api/whatsapp/mock \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=<admin-session-cookie>" \
  -d '{
    "from": "+33612345678",
    "text": "Bonjour Antoine, pour Mme Dupont couronne 26 en urgence, photos ci-jointes",
    "media": [
      { "url": "https://picsum.photos/800/600.jpg", "mimeType": "image/jpeg", "caption": "vue occlusale" }
    ]
  }'
```

Réponse attendue :

```json
{
  "ok": true,
  "caseId": "…",
  "caseNumber": "CAS-2026-00001",
  "isNewCase": true,
  "mediaIngested": 1
}
```

Le dossier apparaît immédiatement sur `/espace-praticien/laboratoire`.

### 6. Passage en production

1. Faire pointer le webhook Meta sur l'URL de prod.
2. Configurer un message d'accueil WhatsApp (via WhatsApp Manager) :
   *« Bonjour, votre message a bien été reçu par Implantolab. Nous vous
   répondons dans les meilleurs délais. »*
3. Envoyer un broadcast depuis l'ancien numéro d'Antoine annonçant le
   nouveau numéro pro.
4. Superviser les 100 premiers dossiers pour valider la qualité de
   l'extraction IA — corriger via l'UI si besoin.

## Fonctionnement des dossiers

### Regroupement des messages

Les messages successifs d'un même numéro dans une fenêtre de **30 minutes**
et sur un dossier au statut `pending_review`, `received` ou `waiting_info`
sont automatiquement ajoutés au même dossier. Passé cette fenêtre, un
nouveau dossier est créé — les admins peuvent fusionner deux dossiers via
l'action *mergeIntoCase* si l'IA a séparé à tort.

### Statuts

| Statut          | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `pending_review`| Extraction IA à valider par un admin.                        |
| `received`      | Dossier validé, en attente d'un prothésiste.                 |
| `in_progress`   | Prothésiste assigné et au travail.                           |
| `waiting_info`  | En attente d'un complément d'information du dentiste.        |
| `completed`     | Prothèse terminée, prête à livrer.                           |
| `delivered`     | Livrée au cabinet.                                           |
| `archived`      | Fermée (annulée, doublon fusionné, etc.).                    |

### Sécurité

- Le bucket `case-media` est **privé**. Les photos ne sont accessibles que
  via `/api/case-media/[id]` qui redirige vers une signed URL valable
  5 minutes après avoir vérifié la session utilisateur.
- Le webhook vérifie systématiquement la signature `x-hub-signature-256`
  avec `WHATSAPP_APP_SECRET`. Toute requête non signée est rejetée en 401.
- Les writes sont faits en `service_role` uniquement depuis le serveur
  Next.js, jamais depuis le navigateur.

## Ce qui n'est PAS fait dans ce MVP

- Envoi automatique d'un accusé de réception WhatsApp au dentiste
  (`sendWhatsAppText` existe mais n'est pas branché).
- OCR sur les photos (le LLM ne voit que le texte pour l'instant).
- Interface pour le dentiste (il envoie juste des WhatsApp).
- Reconnaissance vocale sur les messages audio.
- Facturation / suivi financier.
- App mobile (viendra dans un second temps, connectée aux mêmes tables
  Supabase — auth partagée, temps réel via Realtime).
