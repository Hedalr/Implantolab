# Configuration Notion — Offres de recrutement IMPLANTOLAB

Ce guide décrit la mise en place de Notion comme CMS pour la rubrique
**Recrutement** (`/recrutement`) du site IMPLANTOLAB. Une fois configuré,
ajouter, modifier ou retirer une offre d'emploi revient à créer, éditer ou
décocher une ligne dans une base Notion — sans toucher au code, sans
déploiement. Le site se met à jour automatiquement en moins de 10 minutes
(ISR — Incremental Static Regeneration).

Sans configuration, le site utilise les offres statiques de démonstration
définies dans `content/fr/recrutement.ts`. L'intégration Notion peut donc
être activée à tout moment sans casser la vitrine.

Ce module réutilise **la même intégration Notion** que celle des actualités
(voir `docs/notion-setup.md`) — inutile d'en créer une seconde si elle
existe déjà. Seule une **nouvelle base** dédiée aux offres est nécessaire.

> **Déjà fait pour ce projet** : la base « Offres de recrutement
> Implantolab » a été créée avec les colonnes ci-dessous, pré-remplie avec
> les 3 offres actuellement en ligne.
> URL : https://app.notion.com/p/134ab9e663d6469891ca25ce44253f1b
> ID : `134ab9e663d6469891ca25ce44253f1b` (déjà renseigné dans
> `.env.local`, en commentaire). Il reste à faire les étapes **1**
> (récupérer/créer le `NOTION_TOKEN`) et **3** (partager la base avec
> l'intégration) — ces deux actions se font uniquement depuis l'interface
> Notion, aucun outil ne peut les faire à ta place pour des raisons de
> sécurité.

---

## 1. Réutiliser (ou créer) l'intégration Notion

Si l'intégration `IMPLANTOLAB — Site web` existe déjà (mise en place pour
les actualités), passer directement à l'étape 2 avec le même
`NOTION_TOKEN`.

Sinon, la créer :

1. Se connecter à Notion avec le compte propriétaire de l'espace de
   travail IMPLANTOLAB.
2. Ouvrir [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations).
3. Cliquer sur **New integration**.
4. Renseigner :
   - **Name** : `IMPLANTOLAB — Site web`
   - **Associated workspace** : l'espace de travail IMPLANTOLAB
   - **Capabilities** : cocher au minimum **Read content**.
5. Valider et copier le **Internal Integration Secret** (commence par
   `secret_` ou `ntn_`). Ce secret ne sera plus affiché ensuite.

Ce secret sera collé dans la variable `NOTION_TOKEN` (partagée avec le
module actualités).

---

## 2. Créer la base « Offres de recrutement Implantolab »

Créer une nouvelle page Notion de type **Database — Full page**, nommée
par exemple `Offres de recrutement Implantolab`.

Configurer les colonnes exactement comme ci-dessous. Les noms sont
sensibles à la casse et aux accents.

| Propriété      | Type       | Nom exact       | Notes                                                                          |
|-----------------|------------|-----------------|---------------------------------------------------------------------------------|
| Poste           | Title      | `Poste`         | Colonne par défaut, à renommer. Ex. : `Technicien(ne) CFAO`.                    |
| Contrat         | Select     | `Contrat`       | Trois options exactes à créer : `CDI`, `CDD`, `Alternance`.                     |
| Lieu            | Rich text  | `Lieu`          | Ex. : `Blois (41)`.                                                              |
| Résumé          | Rich text  | `Résumé`        | Description courte du poste (2 à 4 phrases), affichée sur la fiche.             |
| Compétences     | Multi-select | `Compétences` | Une entrée par compétence/mot-clé — créez les options librement.                |
| Ordre           | Number     | `Ordre`         | Optionnel — contrôle l'ordre d'affichage (croissant). Laisser vide si peu importe. |
| Publié          | Checkbox   | `Publié`        | Seules les offres cochées apparaissent sur le site.                             |

**Règle de filtrage** appliquée automatiquement par le site : `Publié` =
true. Le tri suit la colonne `Ordre` (les lignes sans valeur passent en
fin de liste).

**Important** : la valeur de `Contrat` doit correspondre exactement à
`CDI`, `CDD` ou `Alternance` (respect de la casse). Une valeur différente
fait ignorer la ligne par le site.

---

## 3. Partager la base avec l'intégration

Sans partage explicite, l'intégration ne peut rien lire.

1. Ouvrir la base `Offres de recrutement Implantolab`.
2. Cliquer sur le menu **···** en haut à droite.
3. Choisir **Connections** → **Add connections**.
4. Sélectionner l'intégration `IMPLANTOLAB — Site web`.
5. Confirmer.

---

## 4. Récupérer l'identifiant de la base

L'identifiant se trouve dans l'URL de la base ouverte en pleine page.

Format d'URL :

```
https://www.notion.so/<workspace>/<TITRE>-<ID>?v=...
```

L'identifiant est la portion `<ID>` : une chaîne de 32 caractères
alphanumériques (avec ou sans tirets — les deux formats sont acceptés).

Exemple :

```
https://www.notion.so/implantolab/Offres-de-recrutement-Implantolab-98fe76dc54ba3210fedcba9876543210?v=...
                                                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ← ID
```

Cet identifiant sera collé dans la variable `NOTION_JOBS_DATABASE_ID`.

---

## 5. Renseigner les variables d'environnement

En local, dans `.env.local` (voir `.env.local.example`) :

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_JOBS_DATABASE_ID=98fe76dc54ba3210fedcba9876543210
```

Si le module actualités est déjà configuré, `NOTION_TOKEN` existe déjà —
il suffit d'ajouter `NOTION_JOBS_DATABASE_ID`.

En production (Vercel ou équivalent) : renseigner la variable dans les
paramètres du projet, pour les environnements **Preview** et
**Production**. Redéployer pour prise en compte.

---

## 6. Gérer les offres au quotidien

**Publier une offre :**

1. Ouvrir la base `Offres de recrutement Implantolab`.
2. Cliquer sur **New** pour créer une ligne.
3. Renseigner `Poste`, `Contrat`, `Lieu`, `Résumé`, `Compétences`.
4. Cocher `Publié`.

**Modifier une offre :** éditer directement les champs de la ligne — le
site reflète le changement sous 10 minutes.

**Retirer une offre sans la supprimer :** décocher `Publié`. La ligne
reste dans Notion (historique) mais disparaît du site.

**Supprimer définitivement :** supprimer la ligne dans Notion.

**Réordonner les offres :** renseigner `Ordre` (1, 2, 3…) sur les lignes
concernées.

**Aucune offre publiée :** le site affiche automatiquement un message
invitant à la candidature spontanée, avec un bouton vers le formulaire —
aucune action requise de votre part.

---

## 7. Dépannage

- **Les offres n'apparaissent pas** : vérifier que `Publié` est coché et
  que l'intégration a bien été ajoutée aux connexions (étape 3).
- **Une offre est ignorée** : vérifier que `Contrat` vaut exactement
  `CDI`, `CDD` ou `Alternance`, et que `Poste` n'est pas vide.
- **Erreur `Unauthorized`** : `NOTION_TOKEN` invalide.
- **Erreur `object_not_found`** : `NOTION_JOBS_DATABASE_ID` ne correspond
  pas à une base partagée avec l'intégration.
- **Fallback statique actif** : si `NOTION_TOKEN` ou
  `NOTION_JOBS_DATABASE_ID` sont absents ou vides, le site retombe
  silencieusement sur les offres de démonstration de
  `content/fr/recrutement.ts`. Un avertissement est loggé côté serveur.
