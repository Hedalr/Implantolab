#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "db", "dumps");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = join(outDir, `implantolab-${stamp}.sql`);

const result = spawnSync(
  "docker",
  [
    "exec",
    "implantolab-postgres",
    "pg_dump",
    "-U",
    "implantolab",
    "-d",
    "implantolab",
    "--no-owner",
    "--no-acl",
  ],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  console.error(result.stderr || "pg_dump failed");
  console.error(
    "Astuce : pour un dump Scalingo distant, utilisez `scalingo --app APP db-dump`.",
  );
  process.exit(result.status ?? 1);
}

const { writeFileSync } = await import("node:fs");
writeFileSync(outFile, result.stdout, "utf8");
console.log(`Dump écrit : ${outFile}`);
