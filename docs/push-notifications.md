# Notifications push — configuration

Ce guide complète l’implémentation code (Expo Push + webhooks Supabase / Notion).

## Destinataires

| Événement | Destinataires |
|---|---|
| Nouvelle demande `Question` / `Urgence` | Tous les `admin` + `chef_de_secteur` du même `sector_id` |
| Réponse sur un fil Question / Urgence | Le praticien propriétaire (si l’expéditeur n’est pas lui) |
| Actualité Notion `Publié` = true | Tous les `practitioner` |
| Annonce admin (espace admin → Annonces) | Tous les `practitioner` |

## Variables d’environnement (site Next.js / Vercel)

```bash
PUSH_WEBHOOK_SECRET=<secret aléatoire long>
NOTION_WEBHOOK_SECRET=<verification_token Notion après handshake>
# déjà requis pour les actualités :
NOTION_TOKEN=...
NOTION_DATABASE_ID=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
```

Générer un secret : `openssl rand -hex 32`.

## 1. Database Webhooks Supabase

Les webhooks sont créés via triggers `pg_net` (migration
`20260805121000_push_webhooks_pg_net.sql`) :

- `push_on_request_insert` sur `public.requests` (INSERT, sujets Question/Urgence)
- `push_on_message_insert` sur `public.request_messages` (INSERT)
- `prothese_email_on_request_insert` sur `public.requests` (INSERT, sujet
  `Modifications prothèse` → email Resend / étiquette labo, web + mobile)

Le Bearer est lu depuis le secret Vault `push_webhook_secret` (même valeur
que `PUSH_WEBHOOK_SECRET` sur Vercel). URL cibles :
`https://implantolab.vercel.app/api/push/...` et
`https://implantolab.vercel.app/api/prothese/on-request`.

Pour mettre à jour le secret plus tard :

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'push_webhook_secret'),
  '<nouveau-secret>'
);
```

Les deux chemins (création web **et** mobile) déclenchent le webhook.

## 2. Webhook Notion (actualités)

1. Ouvrir l’intégration Notion → onglet **Webhooks** → Create subscription.
2. URL : `https://<votre-domaine>/api/webhooks/notion`
3. Events : au minimum `page.properties_updated` (et idéalement `page.created`).
4. Notion envoie un POST avec `{ "verification_token": "..." }`.
5. Coller ce token :
   - dans le formulaire **Verify** de Notion ;
   - dans `NOTION_WEBHOOK_SECRET` (Vercel + `.env.local`).
6. Redéployer le site pour prendre en compte le secret.

La route vérifie la signature `X-Notion-Signature`, lit la page, et pousse
uniquement si `Publié` = true et que la page n’a pas déjà été notifiée
(`push_actualite_sent`).

## 3. App mobile (EAS)

- Plugin `expo-notifications` déjà dans `app.json`.
- Token enregistré après login (table `push_tokens`).
- **Android** : push distant nécessite un **development build** ou build store
  (pas Expo Go depuis SDK 53).
- Credentials :
  ```bash
  cd "App Mobile Implantolab"
  eas credentials
  ```
  Configurer APNs (iOS) et FCM (Android) pour les profils preview / production.

## 4. Migration SQL

Fichiers :

- `supabase/migrations/20260805120000_push_tokens.sql` — `push_tokens` (RLS owner), `push_actualite_sent` (service_role)
- `supabase/migrations/20260805140000_admin_announcements.sql` — `admin_announcements` (admin CRUD, praticiens SELECT si non expiré)
- `supabase/migrations/20260806160000_prothese_email_webhook_pg_net.sql` — email étiquette Modif prothèse (web + mobile)

Les annonces admin sont envoyées **depuis la Server Action** (pas de webhook `pg_net`) : insert + `notifyAdminAnnouncement`.

## 5. Test rapide

1. Se connecter sur un appareil physique (build dev) → accepter les notifs.
2. Vérifier une ligne dans `push_tokens`.
3. Créer une demande Question depuis un autre compte → notif admin / chef.
4. Répondre depuis l’admin → notif praticien.
5. Cocher `Publié` sur une actu Notion → notif praticiens.
6. Admin → Annonces → envoyer un message → notif praticiens + onglet Annonces dans l’app.
