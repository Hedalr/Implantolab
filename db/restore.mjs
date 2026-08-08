#!/usr/bin/env node
/**
 * Usage: node db/restore.mjs path/to/dump.sql
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run db:restore -- path/to/dump.sql");
  process.exit(1);
}

const sql = readFileSync(resolve(file), "utf8");
const result = spawnSync(
  "docker",
  ["exec", "-i", "implantolab-postgres", "psql", "-U", "implantolab", "-d", "implantolab"],
  { input: sql, encoding: "utf8" },
);

if (result.status !== 0) {
  console.error(result.stderr || "restore failed");
  process.exit(result.status ?? 1);
}

console.log("Restore OK");
