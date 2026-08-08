/**
 * Smoke S14 — Client mobile bearer (SecureStore, HTTPS release, 401, media).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 * Lit aussi les sources du repo voisin `App Mobile Implantolab`.
 *
 * Usage: node scripts/smoke-s14-mobile-client.mjs
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const root = process.cwd();
const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://implantolab:implantolab@localhost:5432/implantolab";
const PASS = "ImplantolabDev1!";
const mobileRoot = join("..", "App Mobile Implantolab");
const CHEF_ID = "22222222-2222-2222-2222-222222222204";
const SECTOR_CHEF = "11111111-1111-1111-1111-111111111102";

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function readMobile(rel) {
  return readFileSync(join(root, mobileRoot, rel), "utf8");
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
  const timer = setTimeout(() => ac.abort(), 30_000);
  try {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
    return { status: res.status, data, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
}

async function login(email) {
  return fetchJson("/api/v1/auth/login", {
    method: "POST",
    body: { email, password: PASS },
  });
}

// --- Source guards (mobile client) ------------------------------------------
const clientSrc = readMobile("lib/api/client.ts");
const authSrc = readMobile("lib/auth/AuthContext.tsx");
const apiRequestsSrc = readMobile("lib/queries/api-requests.ts");
const mediaCacheSrc = readMobile("lib/media/local-cache.ts");
const pushSrc = readMobile("lib/push/register.ts");
const envExample = readMobile(".env.example");

check(
  "SecureStore WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  clientSrc.includes("WHEN_UNLOCKED_THIS_DEVICE_ONLY") &&
    clientSrc.includes("setItemAsync(TOKEN_KEY, token, TOKEN_STORE_OPTIONS)"),
);
check(
  "HTTPS required outside __DEV__",
  clientSrc.includes("isApiBaseUrlAllowed") &&
    clientSrc.includes("__DEV__") &&
    clientSrc.includes("https:") &&
    clientSrc.includes("api_url_insecure"),
);
check(
  "postgres mode fail-closed (no silent Supabase fallback)",
  clientSrc.includes("isPostgresBackendRequested") &&
    authSrc.includes("isPostgresBackendRequested") &&
    authSrc.includes("isApiBackendConfigured()") &&
    /postgresRequested\s*\?\s*isApiBackendConfigured/.test(authSrc),
);
check(
  "401 clears SecureStore + notifies AuthContext",
  clientSrc.includes("onApiUnauthorized") &&
    clientSrc.includes("clearTokenAndNotify") &&
    clientSrc.includes("response.status === 401") &&
    authSrc.includes("onApiUnauthorized(clearApiSession)"),
);
check(
  "login 401 does not wipe bearer",
  clientSrc.includes('path.includes("/auth/login")') &&
    clientSrc.includes("if (!isLogin)"),
);
check(
  "apiLogin stores token ; apiLogout clears",
  clientSrc.includes("await setStoredApiToken(data.token)") &&
    /export async function apiLogout[\s\S]*setStoredApiToken\(null\)/.test(
      clientSrc,
    ),
);
check(
  "media download sends Bearer + handles 401",
  apiRequestsSrc.includes("Authorization: `Bearer ${token}`") &&
    apiRequestsSrc.includes("/api/v1/media/") &&
    apiRequestsSrc.includes("handleApiUnauthorized") &&
    apiRequestsSrc.includes("result.status === 401"),
);
check(
  "purge media-*.bin cache on logout + 401 wipe",
  mediaCacheSrc.includes("purgeLocalMediaCache") &&
    mediaCacheSrc.includes("media-") &&
    mediaCacheSrc.includes(".bin") &&
    clientSrc.includes("purgeLocalMediaCache") &&
    /async function clearTokenAndNotify[\s\S]*purgeLocalMediaCache/.test(
      clientSrc,
    ) &&
    /export async function apiLogout[\s\S]*purgeLocalMediaCache/.test(clientSrc),
);
check(
  "listMediaViaApi n’attend plus storage_path / storage_bucket",
  apiRequestsSrc.includes("listMediaViaApi") &&
    !apiRequestsSrc.includes("storageBucket: row.storage_bucket") &&
    !apiRequestsSrc.includes("storagePath: row.storage_path"),
);
check(
  "media download catch ne log pas l’erreur (anti-fuite token/headers)",
  apiRequestsSrc.includes("fetchMediaLocalUri") &&
    !/console\.(log|debug|info|error|warn)\s*\(/m.test(
      apiRequestsSrc.slice(
        apiRequestsSrc.indexOf("fetchMediaLocalUri"),
        apiRequestsSrc.indexOf("fetchMediaLocalUri") + 900,
      ),
    ),
);
check(
  "push register does not log raw error objects",
  pushSrc.includes('console.error("[push] register api", message)') &&
    !pushSrc.includes('console.error("[push] register api", error)'),
);
check(
  "mobile api-requests maps 401/403/429/5xx (P2-7 S14)",
  apiRequestsSrc.includes("userFacingApiError") &&
    apiRequestsSrc.includes("Session expirée") &&
    apiRequestsSrc.includes("Vous n’avez pas accès") &&
    apiRequestsSrc.includes("Trop de requêtes") &&
    apiRequestsSrc.includes("Erreur serveur"),
);
check(
  ".env.example documents HTTPS release + local http",
  envExample.includes("EXPO_PUBLIC_API_URL") &&
    envExample.includes("HTTPS") &&
    envExample.includes("localhost:3000"),
);
check(
  "no console.log of token/Authorization in mobile auth hotspot",
  !/console\.(log|debug|info)\([^)]*(token|Authorization|Bearer|access_token)/i.test(
    clientSrc + authSrc + apiRequestsSrc + mediaCacheSrc + pushSrc,
  ),
);

// --- Runtime (API contract used by mobile) ----------------------------------
const sql = postgres(databaseUrl, { max: 1 });

try {
  const a = await login("praticien@local.dev");
  check("login praticien returns token", a.status === 200 && Boolean(a.data?.token));
  const tokenA = a.data?.token;
  check(
    "login response has no password field",
    a.data && !("password" in a.data) && typeof a.data.token === "string",
  );

  const me = await fetchJson("/api/v1/me", { token: tokenA });
  check("token works on /me", me.status === 200 && me.data?.profile?.role === "practitioner");

  const logout = await fetchJson("/api/v1/auth/logout", {
    method: "POST",
    token: tokenA,
  });
  check("logout OK", logout.status === 200 || logout.status === 204);

  const meAfter = await fetchJson("/api/v1/me", { token: tokenA });
  check(
    "token expiré/révoké → 401 (re-login)",
    meAfter.status === 401,
    `status=${meAfter.status}`,
  );

  const a2 = await login("praticien@local.dev");
  const b = await login("prothesiste@local.dev");
  check("re-login praticien", a2.status === 200 && Boolean(a2.data?.token));
  check("login prothésiste", b.status === 200 && Boolean(b.data?.token));

  const tokenPrat = a2.data?.token;
  const tokenLab = b.data?.token;

  // Cross-user request IDOR (parity authZ — server already S6; mobile relies on it)
  const listPrat = await fetchJson("/api/v1/requests?limit=5", { token: tokenPrat });
  check("praticien list requests", listPrat.status === 200);
  const ownId = listPrat.data?.requests?.[0]?.id;

  const listLab = await fetchJson("/api/v1/requests?limit=20", { token: tokenLab });
  check("lab list requests", listLab.status === 200);
  check("praticien has at least one request (seed)", Boolean(ownId), `ownId=${ownId}`);

  // Temporary foreign-sector request (owned by chef) for IDOR checks.
  const foreignId = randomUUID();
  const mediaId = randomUUID();
  await sql`
    insert into public.requests (
      id, profile_id, sector_id, subject, message, patient_name, status, created_by
    ) values (
      ${foreignId}::uuid,
      ${CHEF_ID}::uuid,
      ${SECTOR_CHEF}::uuid,
      'Question',
      's14 idor probe',
      'S14 Patient',
      'open',
      ${CHEF_ID}::uuid
    )
  `;
  await sql`
    insert into public.request_media (
      id, request_id, storage_bucket, storage_path, mime_type, size_bytes, original_filename
    ) values (
      ${mediaId}::uuid,
      ${foreignId}::uuid,
      'request-media',
      ${`s14/${foreignId}/probe.jpg`},
      'image/jpeg',
      12,
      'probe.jpg'
    )
  `;

  try {
    const idorPrat = await fetchJson(`/api/v1/requests/${foreignId}`, {
      token: tokenPrat,
    });
    check(
      "request cross-user fail (praticien Bearer)",
      idorPrat.status === 403 || idorPrat.status === 404,
      `status=${idorPrat.status}`,
    );

    const idorLab = await fetchJson(`/api/v1/requests/${foreignId}`, {
      token: tokenLab,
    });
    check(
      "request cross-sector fail (lab Bearer)",
      idorLab.status === 403 || idorLab.status === 404,
      `status=${idorLab.status}`,
    );

    const mediaList = await fetchJson(`/api/v1/requests/${foreignId}/media`, {
      token: tokenLab,
    });
    check(
      "media list cross-sector fail",
      mediaList.status === 403 || mediaList.status === 404,
      `status=${mediaList.status}`,
    );

    const mediaGet = await fetchJson(`/api/v1/media/${mediaId}`, {
      token: tokenLab,
    });
    check(
      "media download cross-user fail (Bearer)",
      mediaGet.status === 403 || mediaGet.status === 404,
      `status=${mediaGet.status}`,
    );
  } finally {
    await sql`delete from public.request_media where id = ${mediaId}::uuid`;
    await sql`delete from public.requests where id = ${foreignId}::uuid`;
  }
} finally {
  await sql.end({ timeout: 5 });
}

if (failed > 0) {
  console.error(`\nS14 FAILED (${failed})`);
  process.exit(1);
}
console.log("\nS14 all good");
