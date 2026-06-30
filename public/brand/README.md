# Identité visuelle — IMPLANTOLAB

Ce dossier accueille les fichiers de marque utilisés sur le site.

## Logo

Fichiers en place :

- `logo.png` — symbole IMPLANTOLAB (utilisé dans le header, le footer et les métadonnées)
- `app/icon.png` et `app/apple-icon.png` — favicon et icône iOS (générés depuis le logo)

Le composant [`components/ui/Logo.tsx`](../../components/ui/Logo.tsx) affiche le symbole
avec le wordmark typographique « Implanto lab ».

## Photos d’atelier

Les visuels du site utilisent actuellement le composant
[`VisualPlaceholder`](../../components/ui/VisualPlaceholder.tsx) avec un
grain texturé. Pour remplacer ces placeholders, déposez vos photos
optimisées (WebP/AVIF si possible) dans `public/photos/` et utilisez
`next/image`.

### Guide photo recommandé

Pour rester cohérent avec la direction artistique premium médical :

- **Lumière** — naturelle ou douce, contraste contenu, pas de flash dur
- **Cadrage** — détails serrés, jamais de plan large bureau désordonné
- **Sujets prioritaires**
  - Mains du prothésiste sur une pièce en cours de finition
  - Fraiseuse ou imprimante 3D en fonctionnement
  - Écran de conception CAD (avec accord du fournisseur logiciel)
  - Détail matériau (zircone brute, céramique, titane)
  - Contrôle qualité (instrument de mesure sur une pièce)
- **Traitement** — colorimétrie sobre, désaturation légère, pas de filtre
- **Ratios** — privilégier portrait 4:5 et carré 1:1 pour s’intégrer aux grilles
