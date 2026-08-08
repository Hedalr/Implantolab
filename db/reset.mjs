#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://implantolab:implantolab@localhost:5432/implantolab";

const sql = postgres(databaseUrl, { max: 1 });

try {
  console.log("Dropping public schema…");
  await sql.unsafe("drop schema public cascade; create schema public;");
} finally {
  await sql.end({ timeout: 5 });
}

function run(script) {
  const result = spawnSync(process.execPath, [join(__dirname, script)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("migrate.mjs");
run("seed.mjs");
