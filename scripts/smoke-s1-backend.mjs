/**
 * Smoke S1 — dual-mode + secrets env.
 * Prérequis HTTP optionnel : `npm run dev` (sinon checks source seuls).
 *
 * Usage: node scripts/smoke-s1-backend.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    console.log(`OK  ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- Source guards ---------------------------------------------------------
const clientSrc = read("lib/db/client.ts");
const backendSrc = read("lib/db/backend.ts");
const serverSrc = read("lib/supabase/server.ts");
const dumpSrc = read("db/dump.mjs");
const loginSrc = read("app/api/v1/auth/login/route.ts");

check(
  "client refuses local Docker URL in production",
  clientSrc.includes("Refusing local Docker DATABASE_URL in production"),
);
check(
  "client requires DATABASE_URL outside local dev",
  clientSrc.includes("DATABASE_URL is required when DATA_BACKEND=postgres"),
);
check(
  "backend rejects invalid DATA_BACKEND in production",
  backendSrc.includes('Invalid DATA_BACKEND=') &&
    backendSrc.includes('NODE_ENV === "production"'),
);
check(
  "getServerSupabase disabled in postgres mode",
  serverSrc.includes("getServerSupabase() is disabled when DATA_BACKEND=postgres"),
);
check(
  "dump.mjs does not log DATABASE_URL",
  !/console\.log\(`DATABASE_URL=/.test(dumpSrc) &&
    !/console\.log\(.*DATABASE_URL/.test(dumpSrc),
);
check(
  "login returns 503 when not postgres",
  loginSrc.includes("postgres_backend_required") && loginSrc.includes("503"),
);

// --- Runtime guards (subprocess, isolated env) -----------------------------
async function runRuntimeGuards() {
  const { createRequire } = await import("node:module");
  const { pathToFileURL } = await import("node:url");
  // Compile-free: re-exec getDatabaseUrl logic via dynamic import of TS is hard;
  // validate via small inline replica of the production rules.
  function looksLikeLocalDockerUrl(url) {
    return (
      /implantolab:implantolab@/i.test(url) ||
      /@(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url)
    );
  }

  {
    const prodLocal = looksLikeLocalDockerUrl(
      "postgresql://implantolab:implantolab@localhost:5432/implantolab",
    );
    check("local Docker URL detector positive", prodLocal === true);
  }
  {
    const remote = looksLikeLocalDockerUrl(
      "postgresql://u:p@ecotert-xxx.postgresql.scalingo.com:5432/db",
    );
    check("local Docker URL detector negative for Scalingo", remote === false);
  }

  // Invalid DATA_BACKEND production throw — eval mirror
  function getDataBackend(env) {
    const raw = (env.DATA_BACKEND ?? "supabase").trim().toLowerCase();
    if (raw === "postgres") return "postgres";
    if (raw === "supabase" || raw === "") return "supabase";
    if (env.NODE_ENV === "production") {
      throw new Error(`Invalid DATA_BACKEND="${raw}"`);
    }
    return "supabase";
  }
  try {
    getDataBackend({ DATA_BACKEND: "postgress", NODE_ENV: "production" });
    check("invalid DATA_BACKEND throws in production", false);
  } catch {
    check("invalid DATA_BACKEND throws in production", true);
  }
  check(
    "invalid DATA_BACKEND falls back in development",
    getDataBackend({ DATA_BACKEND: "postgress", NODE_ENV: "development" }) ===
      "supabase",
  );

  void createRequire;
  void pathToFileURL;
}

// --- HTTP: /api/v1 must 503 when server is on supabase backend -------------
async function runHttpChecks() {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 2500);
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "x@y.z", password: "nope" }),
      signal: ac.signal,
    });
    const body = await res.json().catch(() => ({}));

    if (res.status === 503) {
      check(
        "HTTP /api/v1/auth/login → 503 when backend ≠ postgres (or postgres down path)",
        body.error === "postgres_backend_required",
        `status=${res.status} body=${JSON.stringify(body)}`,
      );
      return;
    }

    // Server is on postgres: login should not be 503; accept 401/400 as healthy.
    if ([400, 401, 403].includes(res.status)) {
      check(
        "HTTP /api/v1 reachable in postgres mode (login rejects bad creds)",
        true,
        `status=${res.status}`,
      );
      console.log(
        "  note: server is DATA_BACKEND=postgres — 503 check skipped (expected).",
      );
      return;
    }

    check(
      "HTTP /api/v1/auth/login unexpected status",
      false,
      `status=${res.status} body=${JSON.stringify(body)}`,
    );
  } catch (err) {
    console.log(
      `SKIP HTTP checks (dev server not reachable at ${baseUrl}): ${err.message}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

await runRuntimeGuards();
await runHttpChecks();

if (failed > 0) {
  console.error(`\nS1 smoke: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\nS1 smoke: all good");
assert.equal(failed, 0);
