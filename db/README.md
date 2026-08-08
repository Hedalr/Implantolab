# Postgres local (Scalingo-ready)

Schéma plain Postgres pour le futur hébergement **Scalingo HDS**.  
La prod / test **Supabase reste intacte** tant que `DATA_BACKEND=supabase`.

## Prérequis

```bash
docker compose up -d
```

URL par défaut :

```
postgresql://implantolab:implantolab@localhost:5432/implantolab
```

## Commandes

```bash
npm run db:migrate   # applique db/migrations/*.sql
npm run db:seed      # secteurs + comptes fictifs
npm run db:reset     # drop public + migrate + seed
```

## Comptes seed

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@local.dev` | `ImplantolabDev1!` | admin |
| `praticien@local.dev` | `ImplantolabDev1!` | practitioner |
| `prothesiste@local.dev` | `ImplantolabDev1!` | prosthetist |
| `chef@local.dev` | `ImplantolabDev1!` | chef_de_secteur |

⚠️ Données fictives uniquement — pas de données de santé réelles hors HDS.

## Cutover Scalingo

Même migrations + `DATABASE_URL` Scalingo. Voir `docs/scalingo-hds.md`.
