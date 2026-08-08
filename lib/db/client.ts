import postgres from "postgres";

const globalForDb = globalThis as unknown as {
  __implantolabSql?: ReturnType<typeof postgres>;
};

/** Identifiants Docker locaux uniquement — jamais en production. */
const LOCAL_DOCKER_DATABASE_URL =
  "postgresql://implantolab:implantolab@localhost:5432/implantolab";

function isLocalDevRuntime(): boolean {
  const env = process.env.NODE_ENV;
  return env === "development" || env === "test";
}

function looksLikeLocalDockerUrl(url: string): boolean {
  return (
    /implantolab:implantolab@/i.test(url) ||
    /@(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url)
  );
}

/**
 * URL Postgres pour le mode `DATA_BACKEND=postgres`.
 * - Prod : `DATABASE_URL` obligatoire ; refuse les URL Docker locales.
 * - Dev/test : fallback Docker local si `DATABASE_URL` absent.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    if (process.env.NODE_ENV === "production" && looksLikeLocalDockerUrl(url)) {
      throw new Error(
        "Refusing local Docker DATABASE_URL in production. Set the Scalingo Postgres URL.",
      );
    }
    return url;
  }

  if (isLocalDevRuntime()) {
    return LOCAL_DOCKER_DATABASE_URL;
  }

  throw new Error(
    "DATABASE_URL is required when DATA_BACKEND=postgres outside local development.",
  );
}

/** Client SQL partagé (mode postgres uniquement). */
export function getSql() {
  if (!globalForDb.__implantolabSql) {
    globalForDb.__implantolabSql = postgres(getDatabaseUrl(), {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalForDb.__implantolabSql;
}

export type Sql = ReturnType<typeof getSql>;
