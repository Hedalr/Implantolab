/**
 * Photos de prévisualisation (stock) en attendant les visuels client.
 * Remplacer les fichiers dans public/photos/ en conservant les mêmes noms.
 */
export const sitePhotos = {
  "Atelier IMPLANTOLAB — Blois": "/photos/hero-atelier.jpg",
  "Détail pilier implantaire — atelier": "/photos/pilier-implantaire.jpg",
  "Couronne céramique — finition": "/photos/couronne-ceramique.jpg",
  "Conception CAD — poste technique": "/photos/conception-cad.jpg",
  "Contrôle qualité — atelier": "/photos/controle-qualite.jpg",
  "Atelier CFAO": "/photos/atelier-cfao.jpg",
  "Finition manuelle": "/photos/finition-manuelle.jpg",
  "Poste de conception": "/photos/poste-conception.jpg",
  "Contrôle dimensionnel": "/photos/controle-dimensionnel.jpg",
  "Zircone brute": "/photos/zircone-brute.jpg",
  "Équipe IMPLANTOLAB — atelier": "/photos/equipe-technique.jpg",
  "Restauration implantaire — atelier": "/photos/restauration-implantaire.jpg",
  // Cas cliniques — clé composite caption + titre
  "cas:couronne-implantaire": "/photos/cas-couronne-implantaire.jpg",
  "cas:stratification-anterieure": "/photos/cas-stratification.jpg",
  "cas:bridge-implantaire": "/photos/cas-bridge-implantaire.jpg",
  "cas:pilier-titane": "/photos/cas-pilier-titane.jpg",
  "cas:facettes": "/photos/cas-facettes.jpg",
  "cas:guide-chirurgical": "/photos/cas-guide-chirurgical.jpg",
  // Actualités fallback
  "actualite:materiaux": "/photos/actualite-materiaux.jpg",
  "actualite:flux-numerique": "/photos/actualite-flux-numerique.jpg",
  "actualite:evenement-atelier": "/photos/actualite-evenement.jpg",
  "actualite:evenement-jop": "/photos/actualite-jop.jpg",
} as const;

export type SitePhotoKey = keyof typeof sitePhotos;

export function resolveSitePhoto(key: string): string | undefined {
  return sitePhotos[key as SitePhotoKey];
}
