# Identité visuelle — IMPLANTOLAB

Ce dossier accueille les fichiers de marque utilisés sur le site.

## Logo

- `logo-mark.png` — spirale, encre sombre, fond transparent (header)
- `logo-mark-invert.png` — spirale claire, fond transparent (footer)
- `logo.png` — version encadrée (Open Graph / métadonnées)

Le composant [`components/ui/Logo.tsx`](../../components/ui/Logo.tsx) affiche le picto
avec le wordmark issu de `site.name` / `site.baseline`.

Favicons App Router : `app/icon.png` et `app/apple-icon.png` (régénérer avec
`python scripts/build-favicon.py`). Fallback : `public/favicon.ico`.

## Photos d’atelier

Les visuels du site utilisent actuellement le composant
[`VisualPlaceholder`](../../components/ui/VisualPlaceholder.tsx) avec un
grain texturé. Pour remplacer ces placeholders, déposez vos photos
optimisées (WebP/AVIF si possible) dans `public/photos/` et utilisez
`next/image`.
