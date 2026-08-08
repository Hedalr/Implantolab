#!/usr/bin/env node
/**
 * Applique db/migrations/*.sql sur DATABASE_URL (Docker local / Scalingo).
 * Usage: node db/migrate.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://implantolab:implantolab@localhost:5432/implantolab";

const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql`
    create table if not exists public.schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const dir = join(__dirname, "migrations");
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const already = await sql`
      select 1 from public.schema_migrations where id = ${file}
    `;
    if (already.length) {
      console.log(`skip  ${file}`);
      continue;
    }

    const body = await readFile(join(dir, file), "utf8");
    console.log(`apply ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`
        insert into public.schema_migrations (id) values (${file})
      `;
    });
  }

  console.log("Migrations OK");
} finally {
  await sql.end({ timeout: 5 });
}
