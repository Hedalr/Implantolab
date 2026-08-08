/**
 * Smoke S9 — cron purge + bearer secrets (fail-closed, path confinement).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`,
 *             CRON_SECRET (+ PUSH_WEBHOOK_SECRET) dans `.env.local`.
 *
 * Usage: node scripts/smoke-s9-cron.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const root = process.cwd();
const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://implantolab:implantolab@localhost:5432/implantolab";

function loadEnvLocal() {
  const envPath = join(root, ".env.local");
  const env = {};
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

const envLocal = loadEnvLocal();
const cronSecret = process.env.CRON_SECRET ?? envLocal.CRON_SECRET;
const pushSecret =
  process.env.PUSH_WEBHOOK_SECRET ?? envLocal.PUSH_WEBHOOK_SECRET;
const storageRoot = resolve(
  process.env.LOCAL_STORAGE_ROOT ??
    envLocal.LOCAL_STORAGE_ROOT ??
    join(root, ".data", "storage"),
);

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    console.log(`OK  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function fetchJson(path, { method = "GET", token, body } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 60_000);
  try {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: payload,
      redirect: "manual",
      signal: ac.signal,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// --- Source guards ---------------------------------------------------------
const bearerSrc = read("lib/api/assert-bearer-secret.ts");
const purgePgSrc = read("lib/requests/purge-request-media-pg.ts");
const cronSrc = read("app/api/cron/purge-request-media/route.ts");
const pushAuthSrc = read("lib/push/webhook-auth.ts");

check(
  "assertBearerSecret uses timingSafeEqual",
  bearerSrc.includes("timingSafeEqual") &&
    bearerSrc.includes("createHash"),
);
check(
  "assertBearerSecret fail-closed without secret → 500 generic",
  bearerSrc.includes("status: 500") &&
    bearerSrc.includes("Configuration serveur manquante") &&
    !bearerSrc.includes("${envName}"),
);
check(
  "assertBearerSecret min length + Bearer case-insensitive",
  bearerSrc.includes("MIN_BEARER_SECRET_LENGTH") &&
    bearerSrc.includes('DATA_BACKEND') &&
    /Bearer\\s\+/.test(bearerSrc) &&
    bearerSrc.includes("/i"),
);
check(
  "cron route uses assertBearerSecret(CRON_SECRET)",
  cronSrc.includes('assertBearerSecret(request, "CRON_SECRET")') &&
    cronSrc.includes("isPostgresBackend"),
);
check(
  "purge pg uses deleteObject + StoragePathError permanent",
  purgePgSrc.includes("deleteObject") &&
    purgePgSrc.includes("StoragePathError") &&
    purgePgSrc.includes("processed_at = now()"),
);
check(
  "push webhooks use PUSH_WEBHOOK_SECRET",
  pushAuthSrc.includes('assertBearerSecret(request, "PUSH_WEBHOOK_SECRET")'),
);

check("CRON_SECRET configured for smoke", Boolean(cronSecret), cronSecret ? `len=${cronSecret.length}` : "missing — set in .env.local + restart dev");
check(
  "PUSH_WEBHOOK_SECRET configured for smoke",
  Boolean(pushSecret),
  pushSecret ? `len=${pushSecret.length}` : "missing",
);

// --- HTTP auth -------------------------------------------------------------
{
  const noAuth = await fetchJson("/api/cron/purge-request-media");
  check(
    "cron without bearer → 401 (or 500 if secret missing on server)",
    noAuth.status === 401 || noAuth.status === 500,
    `HTTP ${noAuth.status}`,
  );
  if (noAuth.status === 500) {
    console.warn(
      "WARN cron returned 500 — restart `npm run dev` after setting CRON_SECRET",
    );
  }
}

if (cronSecret) {
  const bad = await fetchJson("/api/cron/purge-request-media", {
    token: "definitely-wrong-cron-secret",
  });
  check("cron wrong bearer → 401", bad.status === 401, `HTTP ${bad.status}`);
}

if (pushSecret) {
  for (const path of ["/api/push/on-message", "/api/push/on-request"]) {
    const noAuth = await fetchJson(path, { method: "POST", body: {} });
    check(
      `${path} without bearer → 401/500`,
      noAuth.status === 401 || noAuth.status === 500,
      `HTTP ${noAuth.status}`,
    );
    const bad = await fetchJson(path, {
      method: "POST",
      token: "wrong-push-secret",
      body: {},
    });
    check(`${path} wrong bearer → 401`, bad.status === 401, `HTTP ${bad.status}`);
  }
}

// --- Queue: legit delete + poison path -------------------------------------
if (!cronSecret) {
  console.error("ABORT: CRON_SECRET required for queue tests");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const marker = randomUUID();
const legitRel = `requests/smoke-s9/${marker}.bin`;
const legitAbs = join(storageRoot, "request-media", "requests", "smoke-s9", `${marker}.bin`);
const outsideAbs = resolve(storageRoot, "..", `smoke-s9-outside-${marker}.txt`);

try {
  mkdirSync(join(storageRoot, "request-media", "requests", "smoke-s9"), {
    recursive: true,
  });
  writeFileSync(legitAbs, "purge-me");
  writeFileSync(outsideAbs, "must-survive");

  const [legitRow] = await sql`
    insert into public.storage_purge_queue (bucket, path)
    values ('request-media', ${legitRel})
    returning id
  `;
  const [poisonRow] = await sql`
    insert into public.storage_purge_queue (bucket, path)
    values ('request-media', ${`../smoke-s9-outside-${marker}.txt`})
    returning id
  `;

  const cron = await fetchJson("/api/cron/purge-request-media", {
    token: cronSecret,
  });
  check(
    "cron with secret → 200 postgres",
    cron.status === 200 &&
      cron.data?.ok === true &&
      cron.data?.backend === "postgres",
    `HTTP ${cron.status} ${JSON.stringify(cron.data)}`,
  );
  check(
    "cron processed ≥1 queue row",
    typeof cron.data?.processed === "number" && cron.data.processed >= 1,
    `processed=${cron.data?.processed} errors=${cron.data?.errors}`,
  );

  const [legitAfter] = await sql`
    select processed_at, error from public.storage_purge_queue where id = ${legitRow.id}
  `;
  const [poisonAfter] = await sql`
    select processed_at, error from public.storage_purge_queue where id = ${poisonRow.id}
  `;

  check(
    "legit queue row processed + file deleted",
    Boolean(legitAfter?.processed_at) && !existsSync(legitAbs),
    legitAfter?.error ?? (existsSync(legitAbs) ? "file still present" : "ok"),
  );
  check(
    "poison path did not escape LOCAL_STORAGE_ROOT",
    existsSync(outsideAbs),
    outsideAbs,
  );
  check(
    "poison queue row marked permanent (processed_at set, error)",
    Boolean(poisonAfter?.processed_at) && Boolean(poisonAfter?.error),
    `processed_at=${poisonAfter?.processed_at} error=${poisonAfter?.error}`,
  );

  // Cleanup queue rows (files already handled)
  await sql`delete from public.storage_purge_queue where id in (${legitRow.id}, ${poisonRow.id})`;
} finally {
  try {
    if (existsSync(outsideAbs)) rmSync(outsideAbs);
  } catch {
    /* ignore */
  }
  try {
    if (existsSync(legitAbs)) rmSync(legitAbs);
  } catch {
    /* ignore */
  }
  await sql.end({ timeout: 5 });
}

console.log("");
if (failed) {
  console.error(`S9 smoke FAILED (${failed})`);
  process.exit(1);
}
console.log("S9 smoke OK — all good");
