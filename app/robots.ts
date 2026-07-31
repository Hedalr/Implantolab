import type { MetadataRoute } from "next";
import { site } from "@/content/fr/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Espace authentifié : rien n'y est indexable, on évite en plus
        // d'exposer l'arborescence des URL dans les résultats de recherche.
        // Sans slash final, la racine de la section est couverte elle aussi.
        disallow: ["/espace-praticien", "/api"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
