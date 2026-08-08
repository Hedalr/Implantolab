/**
 * Smoke S3 — login / logout / credentials.
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s3-login.mjs
 */
import assert from "node:assert/strict";
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
const EMAIL = "praticien@local.dev";
const PASSWORD = "ImplantolabDev1!";
const SMOKE_IP = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

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

async function fetchJson(
  path,
  { method = "GET", token, body, ip = SMOKE_IP } = {},
) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30_000);
  try {
    const headers = {
      "X-Forwarded-For": ip,
    };
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
    return {
      status: res.status,
      data,
      retryAfter: res.headers.get("retry-after"),
      ms: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function timedLogin(body, ip = SMOKE_IP) {
  const t0 = performance.now();
  const res = await fetchJson("/api/v1/auth/login", {
    method: "POST",
    body,
    ip,
  });
  res.ms = performance.now() - t0;
  return res;
}

// --- Source guards -----------------------------------------------------------
const authSrc = read("lib/api/v1/auth.ts");
const cryptoSrc = read("lib/auth/postgres/crypto.ts");
const rateSrc = read("lib/auth/postgres/login-rate-limit.ts");
const loginRouteSrc = read("app/api/v1/auth/login/route.ts");
const passwordRouteSrc = read("app/espace-praticien/auth/password/route.ts");
const logoutSrc = read("app/api/v1/auth/logout/route.ts");

check(
  "dummy bcrypt hash for unknown-email timing",
  cryptoSrc.includes("DUMMY_PASSWORD_HASH") &&
    authSrc.includes("DUMMY_PASSWORD_HASH"),
);
check(
  "bcrypt cost 12 + progressive rehash on login",
  /BCRYPT_COST\s*=\s*12/.test(cryptoSrc) &&
    cryptoSrc.includes("passwordNeedsRehash") &&
    authSrc.includes("passwordNeedsRehash") &&
    authSrc.includes("hashPassword") &&
    /password_hash\s*=\s*\$\{nextHash\}/.test(authSrc),
);
check(
  "ban checked only after password verify",
  /const valid = await verifyPassword[\s\S]*if \(user\.banned_until/m.test(
    authSrc,
  ),
);
check(
  "deleted → invalid_credentials (not banned leak)",
  authSrc.includes("deleted_at") &&
    /if \(user\.deleted_at\)[\s\S]*invalid_credentials/m.test(authSrc),
);
check(
  "login rate-limit module wired",
  rateSrc.includes("MAX_FAILURES_PER_EMAIL") &&
    authSrc.includes("checkLoginRateLimit") &&
    authSrc.includes("recordLoginFailure"),
);
check(
  "API login passes clientIp + Retry-After on 429",
  loginRouteSrc.includes("getClientIp") &&
    loginRouteSrc.includes("Retry-After"),
);
check(
  "web password route uses apiSignIn + clientIp",
  passwordRouteSrc.includes("apiSignIn") &&
    passwordRouteSrc.includes("getClientIp"),
);
check(
  "API logout clears cookie even if destroy fails",
  logoutSrc.includes("clearPgSessionCookie") &&
    /try\s*\{[\s\S]*apiSignOut[\s\S]*\}\s*catch[\s\S]*clearPgSessionCookie/m.test(
      logoutSrc,
    ),
);
check(
  "login JSON has Cache-Control no-store via json()",
  authSrc.includes('"Cache-Control"') && authSrc.includes("no-store"),
);

// --- Runtime -----------------------------------------------------------------
const sql = postgres(databaseUrl, { max: 1 });

try {
  // 1) Same shape: unknown email vs wrong password
  const unknownEmail = `s3-unknown-${Date.now()}@example.com`;
  const badEmail = await timedLogin(
    { email: unknownEmail, password: "WrongPassword1!" },
    `${SMOKE_IP}`,
  );
  const badPass = await timedLogin(
    { email: EMAIL, password: "WrongPassword1!" },
    `${SMOKE_IP}`,
  );

  check(
    "unknown email → 401 invalid_credentials",
    badEmail.status === 401 && badEmail.data?.error === "invalid_credentials",
    `status=${badEmail.status} body=${JSON.stringify(badEmail.data)}`,
  );
  check(
    "wrong password → 401 invalid_credentials (same shape)",
    badPass.status === 401 &&
      badPass.data?.error === "invalid_credentials" &&
      JSON.stringify(badPass.data) === JSON.stringify(badEmail.data),
    `status=${badPass.status} body=${JSON.stringify(badPass.data)}`,
  );
  // Both paths run bcrypt — expect tens of ms; ratio shouldn't scream "skip".
  const ratio =
    Math.max(badEmail.ms, badPass.ms) / Math.max(1, Math.min(badEmail.ms, badPass.ms));
  check(
    "timing roughly comparable (bcrypt both paths)",
    badEmail.ms > 20 && badPass.ms > 20 && ratio < 8,
    `unknown=${badEmail.ms.toFixed(0)}ms wrongPass=${badPass.ms.toFixed(0)}ms ratio=${ratio.toFixed(2)}`,
  );

  // 2) Banned with valid password → 403
  await sql`
    update public.users
       set banned_until = now() + interval '1 day'
     where lower(email) = lower(${EMAIL})
  `;
  try {
    const banned = await timedLogin(
      { email: EMAIL, password: PASSWORD },
      `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
    );
    check(
      "banned + valid password → 403 banned",
      banned.status === 403 && banned.data?.error === "banned",
      `status=${banned.status} body=${JSON.stringify(banned.data)}`,
    );

    const bannedWrong = await timedLogin(
      { email: EMAIL, password: "WrongPassword1!" },
      `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
    );
    check(
      "banned + wrong password → 401 (no ban oracle)",
      bannedWrong.status === 401 &&
        bannedWrong.data?.error === "invalid_credentials",
      `status=${bannedWrong.status} body=${JSON.stringify(bannedWrong.data)}`,
    );
  } finally {
    await sql`
      update public.users
         set banned_until = null
       where lower(email) = lower(${EMAIL})
    `;
  }

  // 3) Happy login → logout → /me 401
  const loginIp = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
  const login = await timedLogin(
    { email: EMAIL, password: PASSWORD },
    loginIp,
  );
  check(
    "login OK → token",
    login.status === 200 && Boolean(login.data?.token),
    `status=${login.status}`,
  );
  const token = login.data?.token;
  if (!token) throw new Error("abort: no token");

  const [hashRow] = await sql`
    select password_hash from public.users
     where lower(email) = lower(${EMAIL})
     limit 1
  `;
  const costMatch = String(hashRow?.password_hash ?? "").match(/^\$2[aby]?\$(\d+)\$/);
  const hashCost = costMatch ? Number(costMatch[1]) : null;
  check(
    "login rehashes password to bcrypt cost ≥ 12",
    hashCost !== null && hashCost >= 12,
    `cost=${hashCost}`,
  );

  const meOk = await fetchJson("/api/v1/me", { token, ip: loginIp });
  check("GET /me before logout → 200", meOk.status === 200, `status=${meOk.status}`);

  const logout = await fetchJson("/api/v1/auth/logout", {
    method: "POST",
    token,
    ip: loginIp,
  });
  check("logout → 200", logout.status === 200, `status=${logout.status}`);

  const meAfter = await fetchJson("/api/v1/me", { token, ip: loginIp });
  check(
    "GET /me after logout → 401",
    meAfter.status === 401,
    `status=${meAfter.status}`,
  );

  // 4) Rate-limit lockout (same unknown email, dedicated IP)
  const lockEmail = `s3-lockout-${Date.now()}@example.com`;
  const lockIp = `198.18.${Math.floor(Math.random() * 200) + 1}.10`;
  let last = null;
  for (let i = 0; i < 10; i++) {
    last = await timedLogin(
      { email: lockEmail, password: "WrongPassword1!" },
      lockIp,
    );
    if (last.status !== 401) {
      check(
        `rate-limit warm-up #${i + 1} → 401`,
        false,
        `status=${last.status}`,
      );
      break;
    }
  }
  check(
    "10 failures still 401 (under cap)",
    last?.status === 401,
    `status=${last?.status}`,
  );
  const limited = await timedLogin(
    { email: lockEmail, password: "WrongPassword1!" },
    lockIp,
  );
  check(
    "11th failure → 429 rate_limit",
    limited.status === 429 && limited.data?.error === "rate_limit",
    `status=${limited.status} body=${JSON.stringify(limited.data)} retry=${limited.retryAfter}`,
  );
  check(
    "429 has Retry-After",
    Boolean(limited.retryAfter) && Number(limited.retryAfter) > 0,
    `Retry-After=${limited.retryAfter}`,
  );
} catch (err) {
  failed += 1;
  console.error(`FAIL runtime — ${err.message}`);
} finally {
  await sql.end({ timeout: 5 });
}

if (failed > 0) {
  console.error(`\nS3 smoke: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\nS3 smoke: all good");
assert.equal(failed, 0);
