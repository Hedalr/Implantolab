import "server-only";

import { cache } from "react";
import { Client, isFullPage } from "@notionhq/client";

import { recrutement, type RecrutementOpening } from "@/content/fr/recrutement";

/**
 * IMPLANTOLAB — Intégration Notion pour les offres de recrutement.
 *
 * Même principe que `lib/notion.ts` (actualités) : une base Notion dédiée
 * aux offres d'emploi, filtrée sur la case « Publié ». Si `NOTION_TOKEN` ou
 * `NOTION_JOBS_DATABASE_ID` sont absents, on retombe sur les offres
 * statiques de `content/fr/recrutement.ts`, ce qui permet de faire tourner
 * la vitrine sans configuration Notion pour ce module.
 *
 * Voir docs/notion-recrutement-setup.md pour la mise en place côté Notion.
 */

export type { RecrutementOpening };

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_JOBS_DATABASE_ID = process.env.NOTION_JOBS_DATABASE_ID;

const hasNotionJobsConfig = Boolean(
  NOTION_TOKEN && NOTION_TOKEN.trim() && NOTION_JOBS_DATABASE_ID && NOTION_JOBS_DATABASE_ID.trim(),
);

let warnedFallback = false;
function warnFallbackOnce(reason?: string) {
  if (warnedFallback) return;
  warnedFallback = true;
  const suffix = reason ? ` (${reason})` : "";
  console.warn(
    `[notion-jobs] NOTION_TOKEN ou NOTION_JOBS_DATABASE_ID manquants — utilisation des offres statiques de fallback${suffix}.`,
  );
}

const notion = hasNotionJobsConfig ? new Client({ auth: NOTION_TOKEN }) : null;

const CONTRACTS: RecrutementOpening["contract"][] = ["CDI", "CDD", "Alternance"];

function isContract(value: string | undefined): value is RecrutementOpening["contract"] {
  return Boolean(value) && (CONTRACTS as string[]).includes(value as string);
}

const getDataSourceId = cache(async (): Promise<string | null> => {
  if (!notion || !NOTION_JOBS_DATABASE_ID) return null;
  try {
    const db = await notion.databases.retrieve({
      database_id: NOTION_JOBS_DATABASE_ID,
    });
    if ("data_sources" in db && db.data_sources.length > 0) {
      return db.data_sources[0].id;
    }
    return null;
  } catch (error) {
    console.error("[notion-jobs] Impossible de récupérer la base Notion", error);
    return null;
  }
});

type NotionProperty = Record<string, unknown> & { type?: string };

function readRichText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as NotionProperty;
  if (p.type === "title" && Array.isArray(p.title)) {
    return (p.title as Array<{ plain_text?: string }>)
      .map((item) => item.plain_text ?? "")
      .join("");
  }
  if (p.type === "rich_text" && Array.isArray(p.rich_text)) {
    return (p.rich_text as Array<{ plain_text?: string }>)
      .map((item) => item.plain_text ?? "")
      .join("");
  }
  return "";
}

function readSelect(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as NotionProperty;
  if (p.type === "select" && p.select && typeof p.select === "object") {
    const s = p.select as { name?: string };
    return s.name ?? undefined;
  }
  return undefined;
}

function readMultiSelect(prop: unknown): string[] {
  if (!prop || typeof prop !== "object") return [];
  const p = prop as NotionProperty;
  if (p.type === "multi_select" && Array.isArray(p.multi_select)) {
    return (p.multi_select as Array<{ name?: string }>)
      .map((item) => item.name ?? "")
      .filter(Boolean);
  }
  return [];
}

function readNumber(prop: unknown): number | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as NotionProperty;
  if (p.type === "number" && typeof p.number === "number") {
    return p.number;
  }
  return undefined;
}

type PageLike = {
  id: string;
  properties: Record<string, unknown>;
};

function pageToOpening(page: PageLike): RecrutementOpening | null {
  const props = page.properties;
  const role = readRichText(props["Poste"]).trim();
  const contractRaw = readSelect(props["Contrat"]);
  const location = readRichText(props["Lieu"]).trim();
  const summary = readRichText(props["Résumé"]).trim();
  const skills = readMultiSelect(props["Compétences"]);

  if (!role || !isContract(contractRaw)) return null;

  return {
    role,
    contract: contractRaw,
    location,
    summary,
    skills,
  };
}

const fetchPublishedOpenings = cache(async (): Promise<PageLike[]> => {
  if (!notion) return [];
  const dataSourceId = await getDataSourceId();
  if (!dataSourceId) return [];

  try {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: "Publié",
        checkbox: { equals: true },
      },
      page_size: 100,
    });

    const pages = response.results
      .filter((r) => isFullPage(r))
      .map((r) => r as unknown as PageLike);

    // Tri par "Ordre" croissant (optionnel) ; les pages sans valeur passent en fin de liste.
    return pages.sort((a, b) => {
      const orderA = readNumber(a.properties["Ordre"]);
      const orderB = readNumber(b.properties["Ordre"]);
      if (orderA === undefined && orderB === undefined) return 0;
      if (orderA === undefined) return 1;
      if (orderB === undefined) return -1;
      return orderA - orderB;
    });
  } catch (error) {
    console.error("[notion-jobs] Échec de la requête data source", error);
    return [];
  }
});

export const getJobOpenings = cache(
  async (): Promise<RecrutementOpening[]> => {
    if (!hasNotionJobsConfig) {
      warnFallbackOnce();
      return [...recrutement.openings];
    }

    const pages = await fetchPublishedOpenings();
    const openings: RecrutementOpening[] = [];
    for (const page of pages) {
      const opening = pageToOpening(page);
      if (opening) openings.push(opening);
    }

    if (openings.length === 0 && pages.length === 0) {
      warnFallbackOnce("aucune offre publiée récupérée depuis Notion");
      return [...recrutement.openings];
    }

    return openings;
  },
);
