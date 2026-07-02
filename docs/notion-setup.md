# Configuration Notion — Actualités IMPLANTOLAB

Ce guide décrit la mise en place de Notion comme CMS pour la rubrique
**Actualités** du site IMPLANTOLAB. Une fois la configuration terminée,
publier un article revient à créer une ligne dans une base Notion et à
cocher la case « Publié ». Le site se met à jour automatiquement en moins
de 10 minutes (ISR — Incremental Static Regeneration).

Sans configuration, le site utilise une liste d’actualités statiques de
démonstration (`content/fr/actualites.ts`). L’intégration Notion peut donc
être activée à tout moment sans casser la vitrine.

---

## 1. Créer une intégration Notion

1. Se connecter à Notion avec le compte propriétaire de l’espace de
   travail IMPLANTOLAB.
2. Ouvrir la page [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations).
3. Cliquer sur **New integration**.
4. Renseigner :
   - **Name** : `IMPLANTOLAB — Site web`
   - **Associated workspace** : l’espace de travail IMPLANTOLAB
   - **Capabilities** : cocher au minimum **Read content**
     (les autres cases peuvent rester décochées).
5. Valider. Sur l’écran suivant, copier le **Internal Integration Secret**
   (il commence par `secret_` ou `ntn_`). Ce secret ne sera plus affiché
   ensuite — le conserver dans un gestionnaire de mots de passe.

Ce secret sera collé dans la variable `NOTION_TOKEN`.

---

## 2. Créer la base « Actualités Implantolab »

Dans l’espace Notion, créer une nouvelle page de type **Database — Full
page**, nommée par exemple `Actualités Implantolab`.

Configurer les colonnes exactement comme ci-dessous. Les noms sont
sensibles à la casse et aux accents.

| Propriété     | Type              | Nom exact     | Notes                                                                          |
|---------------|-------------------|---------------|--------------------------------------------------------------------------------|
| Titre         | Title             | `Titre`       | Colonne par défaut, à renommer si besoin.                                      |
| Slug          | Rich text         | `Slug`        | URL de l’article. Ex. : `portes-ouvertes-mars-2026`.                           |
| Date          | Date              | `Date`        | Date de publication affichée sur le site.                                      |
| Résumé        | Rich text         | `Résumé`      | Chapô visible dans la liste et en meta description.                            |
| Image         | Files & media *ou* URL | `Image`  | Image de couverture. Un fichier téléversé fonctionne également.                |
| Catégorie     | Select            | `Catégorie`   | Optionnel — libre (ex. : `Événement`, `Matériaux`, `Flux numérique`).          |
| Publié        | Checkbox          | `Publié`      | Seuls les articles cochés apparaissent sur le site.                            |

**Règles de filtrage / tri** appliquées automatiquement par le site :
- Filtre : `Publié` = true.
- Tri : `Date` décroissante.

---

## 3. Partager la base avec l’intégration

Sans partage explicite, l’intégration ne peut rien lire.

1. Ouvrir la base `Actualités Implantolab`.
2. Cliquer sur le menu **···** en haut à droite.
3. Choisir **Connections** → **Add connections**.
4. Sélectionner l’intégration `IMPLANTOLAB — Site web` créée à l’étape 1.
5. Confirmer.

---

## 4. Récupérer l’identifiant de la base

L’identifiant se trouve dans l’URL de la base ouverte en pleine page.

Format d’URL :

```
https://www.notion.so/<workspace>/<TITRE>-<ID>?v=...
```

L’identifiant est la portion `<ID>` : une chaîne de 32 caractères
alphanumériques (avec ou sans tirets — les deux formats sont acceptés).

Exemple :

```
https://www.notion.so/implantolab/Actualites-Implantolab-12ab34cd56ef7890abcdef1234567890?v=...
                                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ← ID
```

Cet identifiant sera collé dans la variable `NOTION_DATABASE_ID`.

---

## 5. Renseigner les variables d’environnement

En local, créer un fichier `.env.local` à la racine du projet à partir du
modèle `.env.local.example` :

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=12ab34cd56ef7890abcdef1234567890
```

En production (Vercel ou équivalent) : renseigner ces deux variables dans
les paramètres du projet, pour les environnements **Preview** et
**Production**. Redéployer pour prise en compte.

---

## 6. Publier un article

1. Ouvrir la base `Actualités Implantolab`.
2. Cliquer sur **New** pour créer une ligne.
3. Renseigner :
   - `Titre` : le titre de l’actualité.
   - `Slug` : URL courte (minuscules, tirets — ex. `zircone-monolithique-rac-0`).
   - `Date` : date de publication.
   - `Résumé` : 1 à 3 phrases (utilisées en accroche et en meta description).
   - `Image` : image de couverture (facultative mais recommandée).
   - `Catégorie` : facultatif.
   - `Publié` : cocher pour publier.
4. Ouvrir la page (en cliquant sur le titre) et rédiger le corps de
   l’article avec les blocs Notion habituels (titres, paragraphes,
   listes, images, citations, code…).

Le site se met à jour automatiquement sous **10 minutes** (durée du cache
ISR). Pour forcer une régénération immédiate, redéployer le site.

---

## 7. Dépannage

- **Les articles n’apparaissent pas** : vérifier que la case `Publié`
  est cochée et que l’intégration a bien été ajoutée aux connexions
  (étape 3).
- **Erreur `Unauthorized`** ou base vide dans les logs : le
  `NOTION_TOKEN` est invalide ou l’intégration n’a pas accès à la base.
- **Erreur `object_not_found`** : le `NOTION_DATABASE_ID` ne correspond
  pas à une base partagée avec l’intégration.
- **Une image ne s’affiche pas** : les URL des fichiers téléversés dans
  Notion expirent après une heure. Le site les régénère lors du prochain
  passage ISR (10 min). Pour une image toujours stable, préférer la
  propriété `Image` au format **URL** avec un lien vers un CDN externe.
- **Fallback statique actif** : si les variables `NOTION_TOKEN` ou
  `NOTION_DATABASE_ID` sont absentes ou vides, le site retombe
  silencieusement sur les articles de démonstration. Un avertissement
  est loggé côté serveur en développement.
