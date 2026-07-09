import type { Article, ArticleDetail } from "@/lib/notion";

/**
 * Actualités statiques utilisées en fallback lorsque l'intégration Notion
 * n'est pas configurée (NOTION_TOKEN / NOTION_DATABASE_ID absents).
 * Ces contenus permettent de démonstrer la vitrine sans setup préalable.
 * L'HTML des détails est écrit à la main et considéré comme sûr.
 */

export const fallbackArticles: Article[] = [
  {
    slug: "bridge-ancrage-dent-naturelle-bredent",
    title:
      "Bridge ancré sur dent naturelle : première réalisation 100 % numérique en France",
    excerpt:
      "En collaboration avec BREDENT, IMPLANTOLAB présente un bridge ancré sur dent naturelle entièrement conçu en flux numérique — avec rattrapage d’axe des préparations. Un cas publié dans Technologie Dentaire.",
    date: "2026-07-09",
    coverUrl: "/photos/protheses/bridge-transvisse-1.jpg",
    category: "Innovation",
  },
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

const bridgeBredentHtml = `
<p>IMPLANTOLAB et <strong>BREDENT</strong> ont réalisé un bridge ancré sur dent
naturelle entièrement conçu en flux numérique — une première en France dans
cette configuration. Ce cas, documenté par des photos cliniques et
laboratoire, a fait l’objet d’un article dans le magazine
<strong>Technologie Dentaire</strong>.</p>

<h2>Un bridge ancré sur dent naturelle</h2>
<p>L’indication repose sur un ancrage prothétique sur dents piliers saines,
sans recours à des implants intermédiaires. La restauration conjointe
permet de reconstituer plusieurs éléments tout en conservant le capital
dentaire disponible, avec une intégration esthétique et fonctionnelle
conforme aux exigences du secteur antérieur comme postérieur.</p>

<h2>Le rattrapage d’axe des préparations</h2>
<p>L’un des apports majeurs de ce workflow réside dans la capacité à
<strong>rattraper l’axe des préparations</strong> lorsque celles-ci présentent
des inclinaisons ou des désaxages difficiles à compenser en conventionnel.
La conception CAO permet d’ajuster virtuellement les émergences, les
contacts proximaux et l’occlusion avant usinage, pour une restauration
finalisée avec un ajustage marginal maîtrisé.</p>

<h2>Un flux entièrement numérique</h2>
<p>De la prise d’empreinte numérique à la livraison de la prothèse, chaque
étape s’inscrit dans une chaîne CFAO documentée : scan, modélisation,
usinage et contrôle qualité. Aucune étape analogique intermédiaire n’a
été nécessaire — ce qui garantit traçabilité, reproductibilité et
délais maîtrisés.</p>

<p>Ce protocole, développé en étroite collaboration avec les équipes
techniques de BREDENT, illustre la maturité des flux numériques appliqués
aux restaurations conjointes sur dents naturelles.</p>

<h2>Photos du cas</h2>
<p>Retrouvez ci-dessous les visuels du cas : restauration usinée, détails
prothétiques et intégration sur modèle.</p>

<figure>
  <img src="/photos/protheses/bridge-transvisse-1.jpg" alt="Bridge ancré sur dent naturelle, vue générale de la restauration" />
  <figcaption>Bridge ancré sur dent naturelle — vue générale de la restauration usinée.</figcaption>
</figure>

<figure>
  <img src="/photos/protheses/bridge-transvisse-2.jpg" alt="Bridge ancré sur dent naturelle, vue occlusale" />
  <figcaption>Vue occlusale — rattrapage d’axe des préparations intégré à la conception CAO.</figcaption>
</figure>

<figure>
  <img src="/photos/protheses/bridge-transvisse-3.jpg" alt="Bridge ancré sur dent naturelle, détail prothétique" />
  <figcaption>Détail prothétique — finition et continuité des émergences.</figcaption>
</figure>

<figure>
  <img src="/photos/protheses/bridge-transvisse-4.jpg" alt="Bridge ancré sur dent naturelle, intégration sur modèle" />
  <figcaption>Restauration finalisée sur modèle — contrôle d’ajustage avant expédition.</figcaption>
</figure>

<h2>Publication dans Technologie Dentaire</h2>
<p>Ce cas a été retenu par la rédaction de <strong>Technologie Dentaire</strong>
pour illustrer l’avancée des laboratoires français vers un flux 100 %
numérique sur des indications conjointes classiques. Il confirme qu’un
bridge sur dent naturelle peut aujourd’hui être entièrement conçu,
usiné et validé dans un protocole CFAO abouti.</p>

<h2>Pour adresser un cas similaire</h2>
<p>Vous souhaitez nous adresser un bridge ancré sur dent naturelle ou
en savoir plus sur nos flux numériques en collaboration avec BREDENT ?
Contactez notre équipe technique via le formulaire de contact — nous
validons l’indication et vous confirmons le protocole adapté à votre cas.</p>
`;

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
  <li>Démonstration de conception CAO et d’usinage 5 axes.</li>
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
  "bridge-ancrage-dent-naturelle-bredent": {
    ...fallbackArticles[0],
    contentHtml: bridgeBredentHtml,
  },
  "zircone-monolithique-rac-0": {
    ...fallbackArticles[1],
    contentHtml: zirconeHtml,
  },
  "nouveau-scanner-intra-oral-compatible": {
    ...fallbackArticles[2],
    contentHtml: scannerHtml,
  },
  "portes-ouvertes-atelier-mars-2026": {
    ...fallbackArticles[3],
    contentHtml: portesOuvertesHtml,
  },
  "retour-jop-dentaires-2025": {
    ...fallbackArticles[4],
    contentHtml: jopHtml,
  },
};
