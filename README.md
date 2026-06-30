# IMPLANTOLAB — Site vitrine

Site vitrine B2B premium du laboratoire de prothèse dentaire IMPLANTOLAB,
orienté implantologie, fabrication sur mesure et flux numérique CFAO.

## Stack

- [Next.js 15](https://nextjs.org/) — App Router, TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) — design tokens custom
- [next/font](https://nextjs.org/docs/app/api-reference/components/font) —
  Fraunces (serif) + Source Sans 3 (sans-serif)
- Composants modulaires, contenu FR isolé dans `content/fr/`

## Démarrage

```bash
npm install
npm run dev
```

Le site est servi sur [http://localhost:3000](http://localhost:3000).

## Structure

```
app/                  Pages Next.js (App Router)
  layout.tsx          Layout global, fonts, header, footer, JSON-LD
  page.tsx            Accueil
  [route]/page.tsx    Pages secondaires
components/
  layout/             Header, Footer, MobileNav, SimplePage
  sections/           Sections de page réutilisables
  ui/                 Container, Button, Logo, Reveal, VisualPlaceholder…
content/fr/           Tous les contenus français centralisés
  site.ts             Identité, navigation, coordonnées
  home.ts             Contenu de l’accueil
  pages.ts            Contenu des pages secondaires
lib/                  Helpers (cn, metadata)
public/brand/         Logo et favicon (voir README dédié)
```

## Personnaliser

| Élément | Fichier |
|---|---|
| Coordonnées (téléphone, email, adresse, horaires) | [`content/fr/site.ts`](content/fr/site.ts) |
| Navigation principale et footer | [`content/fr/site.ts`](content/fr/site.ts) |
| Contenus de l’accueil | [`content/fr/home.ts`](content/fr/home.ts) |
| Contenus des autres pages | [`content/fr/pages.ts`](content/fr/pages.ts) |
| Direction artistique (variante luxe / technique) | [`app/globals.css`](app/globals.css) |
| Logo | [`components/ui/Logo.tsx`](components/ui/Logo.tsx) — `public/brand/` |

## Direction artistique

Trois directions sont documentées dans le plan de conception :

- **Équilibrée premium médical** — variante actuellement active
- **Luxe / minimaliste** — bloc CSS commenté dans `app/globals.css`
- **Technique / industrielle** — bloc CSS commenté dans `app/globals.css`

Pour basculer entre variantes, remplacez le bloc `:root` actif par la
variante désirée — aucune modification de composant n’est nécessaire,
toutes les couleurs sont consommées via des CSS variables.

## Roadmap technique

- Phase actuelle — site vitrine, contenu local TypeScript, formulaire mock
- Phase suivante — connexion email (Resend ou SMTP), CMS headless si besoin
  (Sanity, Payload), suivi analytics RGPD-friendly (Plausible, Matomo)
- Phase ultérieure — espace praticien, upload sécurisé STL (Supabase
  Storage ou S3), galerie de cas cliniques alimentée par le CMS

## Accessibilité et SEO

- HTML sémantique, contrastes WCAG AA, focus visible, lien d’évitement
- `next/font` (pas de FOUT), `metadata` par page, OpenGraph, Twitter cards
- JSON-LD `MedicalBusiness` global + sur la page contact
- `sitemap.xml` et `robots.txt` générés automatiquement
- `prefers-reduced-motion` respecté pour les animations subtiles

## Livraison attendue avant mise en production

- Logo final (SVG) dans `public/brand/`
- Coordonnées réelles dans [`content/fr/site.ts`](content/fr/site.ts)
- 5 à 10 photos d’atelier optimisées dans `public/photos/`
- Mentions légales complétées (SIREN, directeur de publication, hébergeur)
- Connexion du formulaire à un service d’envoi d’email
