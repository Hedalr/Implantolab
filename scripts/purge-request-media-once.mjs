import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: pending, error } = await admin
  .from("storage_purge_queue")
  .select("id, bucket, path")
  .is("processed_at", null);

if (error) {
  console.error("queue", error);
  process.exit(1);
}

console.log("pending", pending?.length ?? 0);

if (!pending?.length) {
  const { data: orphans } = await admin.rpc("list_orphan_request_media_paths");
  console.log("orphans left", orphans?.length ?? 0);
  process.exit(0);
}

const byBucket = new Map();
for (const item of pending) {
  const bucket = item.bucket || "request-media";
  const list = byBucket.get(bucket) ?? [];
  list.push(item);
  byBucket.set(bucket, list);
}

let removed = 0;
for (const [bucket, items] of byBucket) {
  const paths = [...new Set(items.map((i) => i.path))];
  const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
  if (rmErr) {
    console.error("remove", rmErr);
    process.exit(1);
  }
  const ids = items.map((i) => i.id);
  const now = new Date().toISOString();
  const { error: upErr } = await admin
    .from("storage_purge_queue")
    .update({ processed_at: now, error: null })
    .in("id", ids);
  if (upErr) {
    console.error("update", upErr);
    process.exit(1);
  }
  removed += paths.length;
}

const { data: orphans } = await admin.rpc("list_orphan_request_media_paths");
console.log("removed", removed);
console.log("orphans left", orphans?.length ?? 0);
