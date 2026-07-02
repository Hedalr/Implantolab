import type { Article, ArticleDetail } from "@/lib/notion";

/**
 * Actualités statiques utilisées en fallback lorsque l'intégration Notion
 * n'est pas configurée (NOTION_TOKEN / NOTION_DATABASE_ID absents).
 * Ces contenus permettent de démonstrer la vitrine sans setup préalable.
 * L'HTML des détails est écrit à la main et considéré comme sûr.
 */

export const fallbackArticles: Article[] = [
  {
    slug: "zircone-monolithique-rac-0",
    title: "Zircone monolithique : intégration au panier RAC 0",
    excerpt:
      "IMPLANTOLAB fait évoluer sa gamme zircone monolithique pour la rendre compatible avec les indications RAC 0, sans compromis sur la précision d’ajustage.",
    date: "2026-04-18",
    coverUrl: "/photos/actualite-materiaux.jpg",
    category: "Matériaux",
  },
  {
    slug: "nouveau-scanner-intra-oral-compatible",
    title: "Nouveau scanner intra-oral compatible ajouté à nos flux",
    excerpt:
      "Notre chaîne CFAO accepte désormais les fichiers issus du scanner Medit i900, avec import direct et validation qualité automatisée.",
    date: "2026-03-05",
    coverUrl: "/photos/actualite-flux-numerique.jpg",
    category: "Flux numérique",
  },
  {
    slug: "portes-ouvertes-atelier-mars-2026",
    title: "Portes ouvertes atelier — mars 2026",
    excerpt:
      "Nous ouvrons les portes de notre atelier de Blois aux praticiens partenaires les 20 et 21 mars 2026. Sur inscription auprès de votre référent.",
    date: "2026-02-12",
    coverUrl: "/photos/actualite-evenement.jpg",
    category: "Événement",
  },
  {
    slug: "retour-jop-dentaires-2025",
    title: "Retour sur les JOP dentaires 2025",
    excerpt:
      "L’équipe technique d’IMPLANTOLAB a assisté aux Journées de l’Orthèse Prothétique 2025 : nos points clés à retenir sur la CFAO et les céramiques hybrides.",
    date: "2025-11-24",
    coverUrl: "/photos/actualite-jop.jpg",
    category: "Événement",
  },
];

const zirconeHtml = `
<p>La prise en charge élargie du Reste À Charge 0 (RAC 0) impose aux laboratoires
de proposer des restaurations à la fois économiquement accessibles et
techniquement irréprochables. La zircone monolithique — travaillée dans nos
protocoles d'usinage 5 axes — permet de répondre à ces deux exigences.</p>

<h2>Une gamme adaptée au panier RAC 0</h2>
<p>Nous avons revu notre chaîne d’approvisionnement et notre protocole
d’usinage afin d’intégrer des blocs zircone haute translucidité éligibles
au remboursement RAC 0 pour les couronnes postérieures. Le rendu esthétique
reste fidèle à nos standards, avec une teinte stabilisée et un état de
surface poli miroir.</p>

<h2>Un ajustage vérifié systématiquement</h2>
<p>Chaque restauration est contrôlée dimensionnellement avant expédition.
La précision d’adaptation marginale est mesurée sur banc et documentée dans
la fiche de traçabilité qui vous est remise avec le cas.</p>

<h2>Comment en profiter</h2>
<p>Il vous suffit de préciser lors de l’envoi du cas votre volonté de recourir
à la gamme RAC 0. Nos équipes valident l’indication et vous confirment le
délai de fabrication sous 24 heures ouvrées.</p>
`;

const scannerHtml = `
<p>Notre parc technique s’enrichit d’une compatibilité native avec le
scanner intra-oral <strong>Medit i900</strong>. Les fichiers STL et PLY
issus de cet équipement sont désormais acceptés en flux direct, sans
étape de conversion intermédiaire.</p>

<h2>Un flux numérique documenté</h2>
<p>Dès la réception du fichier, notre équipe procède à un contrôle qualité
du scan : couverture des faces, détection des zones incomplètes, vérification
des marges. Un rapport synthétique est renvoyé au cabinet en cas de reprise
nécessaire.</p>

<h2>Formats acceptés</h2>
<ul>
  <li>STL — format standard, compatible tous scanners.</li>
  <li>PLY — utile pour les scans polychromes.</li>
  <li>OBJ — sur demande, pour les workflows spécifiques.</li>
</ul>

<h2>Un accompagnement à la mise en route</h2>
<p>Nous accompagnons les cabinets qui souhaitent migrer vers un flux full
numérique. Notre référent technique vous guide sur la configuration
d’export et les meilleures pratiques cliniques associées.</p>
`;

const portesOuvertesHtml = `
<p>Les 20 et 21 mars 2026, IMPLANTOLAB ouvre les portes de son atelier de
Blois aux praticiens partenaires. Deux journées pour découvrir notre
organisation interne, échanger avec nos prothésistes et observer notre
chaîne CFAO en fonctionnement.</p>

<h2>Programme</h2>
<ul>
  <li>Visite guidée de l’atelier et présentation des postes techniques.</li>
  <li>Démonstration de conception CAD et d’usinage 5 axes.</li>
  <li>Échange informel avec l’équipe autour d’un café.</li>
</ul>

<h2>Sur inscription</h2>
<p>Le nombre de places est limité pour préserver la qualité des échanges.
Merci d’adresser votre demande d’inscription à votre référent technique ou
directement via notre formulaire de contact, en précisant la date souhaitée.</p>
`;

const jopHtml = `
<p>Notre équipe technique a assisté aux Journées de l’Orthèse Prothétique
(JOP) 2025. Retour sur les tendances marquantes de l’édition, avec un focus
sur la CFAO et l’évolution des céramiques hybrides.</p>

<h2>CFAO : la fin du full analogique</h2>
<p>Les échanges confirment ce que nous observons au laboratoire : la CFAO
s’impose comme la norme, y compris pour les restaurations amovibles. Les
scanners intra-oraux gagnent en précision et les logiciels de conception
proposent des workflows de plus en plus automatisés.</p>

<h2>Céramiques hybrides : maturation</h2>
<p>Les céramiques hybrides gagnent en fiabilité clinique. Elles restent une
option intéressante pour les patients bruxeurs modérés ou pour les
restaurations transitoires longue durée.</p>

<h2>Ce que nous en retenons</h2>
<p>Nous poursuivons nos investissements en formation continue et en
équipements, avec un cap clair : garantir à nos praticiens partenaires un
accès aux techniques les plus fiables, sans jamais transiger sur l’exigence
d’ajustage et d’intégration clinique.</p>
`;

export const fallbackArticleDetails: Record<string, ArticleDetail> = {
  "zircone-monolithique-rac-0": {
    ...fallbackArticles[0],
    contentHtml: zirconeHtml,
  },
  "nouveau-scanner-intra-oral-compatible": {
    ...fallbackArticles[1],
    contentHtml: scannerHtml,
  },
  "portes-ouvertes-atelier-mars-2026": {
    ...fallbackArticles[2],
    contentHtml: portesOuvertesHtml,
  },
  "retour-jop-dentaires-2025": {
    ...fallbackArticles[3],
    contentHtml: jopHtml,
  },
};
