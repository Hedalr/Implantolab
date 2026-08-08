/**
 * Smoke S2 — sessions / cookies / proxy postgres.
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s2-sessions.mjs
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
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

function parseSetCookie(header) {
  if (!header) return null;
  // fetch may join multiple Set-Cookie with ", " — take the il_session one.
  const parts = String(header).split(/,(?=\s*[^;=]+=)/);
  const raw =
    parts.find((p) => /^\s*il_session=/i.test(p)) ??
    parts.find((p) => /il_session=/i.test(p));
  if (!raw) return null;
  const attrs = raw.split(";").map((s) => s.trim());
  const [nameValue, ...flags] = attrs;
  const eq = nameValue.indexOf("=");
  const value = eq >= 0 ? nameValue.slice(eq + 1) : "";
  const lower = flags.map((f) => f.toLowerCase());
  return {
    value,
    httpOnly: lower.some((f) => f === "httponly"),
    sameSite: lower.find((f) => f.startsWith("samesite="))?.split("=")[1],
    secure: lower.some((f) => f === "secure"),
    path: lower.find((f) => f.startsWith("path="))?.split("=")[1],
    maxAge: lower.find((f) => f.startsWith("max-age="))?.split("=")[1],
  };
}

async function fetchJson(path, { method = "GET", token, cookie, body } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cookie) headers.Cookie = cookie;
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
      setCookie: res.headers.getSetCookie?.() ?? [],
      setCookieRaw:
        res.headers.get("set-cookie") ??
        (res.headers.getSetCookie?.() ?? []).join(", "),
    };
  } finally {
    clearTimeout(timer);
  }
}

// --- Source guards -----------------------------------------------------------
const cookiesSrc = read("lib/auth/postgres/cookies.ts");
const sessionSrc = read("lib/auth/postgres/session.ts");
const cryptoSrc = read("lib/auth/postgres/crypto.ts");
const mwSrc = read("lib/auth/postgres/middleware.ts");
const proxySrc = read("proxy.ts");
const logoutSrc = read("app/espace-praticien/logout/route.ts");

check(
  "cookie HttpOnly + SameSite=lax",
  cookiesSrc.includes("httpOnly: true") &&
    cookiesSrc.includes('sameSite: "lax"'),
);
check(
  "cookie Secure only in production",
  cookiesSrc.includes('secure: process.env.NODE_ENV === "production"'),
);
check(
  "session TTL 7d + hash lookup + ban/deleted guards",
  sessionSrc.includes("7 * 24 * 60 * 60 * 1000") &&
    sessionSrc.includes("token_hash") &&
    sessionSrc.includes("banned_until") &&
    sessionSrc.includes("deleted_at is null"),
);
check(
  "session token entropy (32 random bytes)",
  cryptoSrc.includes("randomBytes(32)") && cryptoSrc.includes("sha256"),
);
check(
  "middleware destroys invalid token + clears cookie",
  mwSrc.includes("destroyPgSessionToken") &&
    mwSrc.includes("clearPgSessionCookie"),
);
check(
  "proxy clears cookie on auth redirect",
  proxySrc.includes("clearSessionCookie") &&
    proxySrc.includes("clearPgSessionCookie"),
);
check(
  "web logout always clears cookie (outside destroy try)",
  logoutSrc.includes("clearPgSessionCookie(response)") &&
    /try\s*\{[\s\S]*destroyPgSessionToken[\s\S]*\}\s*catch[\s\S]*clearPgSessionCookie/m.test(
      logoutSrc,
    ),
);

// --- Runtime HTTP + DB -------------------------------------------------------
const sql = postgres(databaseUrl, { max: 1 });

try {
  // 1) Bearer login without cookie
  const login = await fetchJson("/api/v1/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  check(
    "API login → token (bearer, no cookie required)",
    login.status === 200 && Boolean(login.data?.token),
    `status=${login.status}`,
  );
  const token = login.data?.token;
  if (!token) throw new Error("abort: no token");

  const rowsBefore = await sql`
    select id from public.sessions where token_hash = ${hashToken(token)} limit 1
  `;
  check("session row created on login", rowsBefore.length === 1);

  const meBearer = await fetchJson("/api/v1/me", { token });
  check(
    "GET /me with Bearer only (no Cookie) → 200",
    meBearer.status === 200 && meBearer.data?.profile?.email === EMAIL,
    `status=${meBearer.status}`,
  );

  // 2) Logout destroys row
  const logout = await fetchJson("/api/v1/auth/logout", {
    method: "POST",
    token,
  });
  check("API logout → 200", logout.status === 200, `status=${logout.status}`);
  const clearCookie = parseSetCookie(
    (logout.setCookie ?? []).join(", ") || logout.setCookieRaw,
  );
  check(
    "API logout Set-Cookie clears il_session",
    Boolean(clearCookie) &&
      (clearCookie.value === "" || clearCookie.maxAge === "0"),
    clearCookie ? `maxAge=${clearCookie.maxAge}` : "missing Set-Cookie",
  );
  const rowsAfter = await sql`
    select id from public.sessions where token_hash = ${hashToken(token)} limit 1
  `;
  check("logout deleted session row", rowsAfter.length === 0);
  const meAfter = await fetchJson("/api/v1/me", { token });
  check("GET /me after logout → 401", meAfter.status === 401, `status=${meAfter.status}`);

  // 3) Banned mid-session → 401 (session row still present)
  const login2 = await fetchJson("/api/v1/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  const token2 = login2.data?.token;
  check("re-login for ban test", Boolean(token2), `status=${login2.status}`);
  if (!token2) throw new Error("abort: no token2");

  await sql`
    update public.users
       set banned_until = now() + interval '1 day'
     where lower(email) = lower(${EMAIL})
  `;
  try {
    const meBanned = await fetchJson("/api/v1/me", { token: token2 });
    check(
      "banned mid-session → /me 401",
      meBanned.status === 401,
      `status=${meBanned.status}`,
    );

    // Cookie path: invalid session should not authorize (and middleware destroys).
    const meCookieBanned = await fetchJson("/api/v1/me", {
      cookie: `il_session=${token2}`,
    });
    check(
      "banned mid-session cookie → /me 401",
      meCookieBanned.status === 401,
      `status=${meCookieBanned.status}`,
    );
  } finally {
    await sql`
      update public.users
         set banned_until = null
       where lower(email) = lower(${EMAIL})
    `;
    await sql`
      delete from public.sessions where token_hash = ${hashToken(token2)}
    `;
  }

  // 4) Web login cookie flags (HttpOnly / SameSite)
  const webLogin = await fetchJson("/espace-praticien/auth/password", {
    method: "POST",
    body: undefined,
  });
  // form-urlencoded via raw fetch
  {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8000);
    try {
      const form = new URLSearchParams({ email: EMAIL, password: PASSWORD });
      const res = await fetch(`${baseUrl}/espace-praticien/auth/password`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        redirect: "manual",
        signal: ac.signal,
      });
      const setCookies =
        typeof res.headers.getSetCookie === "function"
          ? res.headers.getSetCookie()
          : [];
      const raw =
        setCookies.join(", ") || res.headers.get("set-cookie") || "";
      const cookie = parseSetCookie(raw);
      check(
        "web login redirects (303/302)",
        res.status === 303 || res.status === 302,
        `status=${res.status}`,
      );
      check(
        "web login Set-Cookie il_session HttpOnly",
        Boolean(cookie?.httpOnly) && Boolean(cookie?.value),
        cookie ? `httpOnly=${cookie.httpOnly}` : "no cookie",
      );
      check(
        "web login SameSite=Lax",
        (cookie?.sameSite ?? "").toLowerCase() === "lax",
        cookie ? `sameSite=${cookie.sameSite}` : "no cookie",
      );
      check(
        "web login Secure off in local (NODE_ENV≠production)",
        cookie ? cookie.secure === false : false,
        cookie ? `secure=${cookie.secure}` : "no cookie",
      );

      const webToken = cookie?.value;
      if (webToken) {
        const webRows = await sql`
          select id from public.sessions
           where token_hash = ${hashToken(webToken)}
           limit 1
        `;
        check("web login session row exists", webRows.length === 1);

        const webLogout = await fetch(
          `${baseUrl}/espace-praticien/logout`,
          {
            method: "POST",
            headers: { Cookie: `il_session=${webToken}` },
            redirect: "manual",
            signal: ac.signal,
          },
        );
        check(
          "web logout redirects",
          webLogout.status === 303 || webLogout.status === 302,
          `status=${webLogout.status}`,
        );
        const webLogoutCookies =
          typeof webLogout.headers.getSetCookie === "function"
            ? webLogout.headers.getSetCookie()
            : [];
        const cleared = parseSetCookie(
          webLogoutCookies.join(", ") ||
            webLogout.headers.get("set-cookie") ||
            "",
        );
        check(
          "web logout clears cookie",
          Boolean(cleared) &&
            (cleared.value === "" || cleared.maxAge === "0"),
        );
        const afterWeb = await sql`
          select id from public.sessions
           where token_hash = ${hashToken(webToken)}
           limit 1
        `;
        check("web logout deleted session row", afterWeb.length === 0);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  void webLogin;
} catch (err) {
  failed += 1;
  console.error(`FAIL runtime — ${err.message}`);
} finally {
  await sql.end({ timeout: 5 });
}

if (failed > 0) {
  console.error(`\nS2 smoke: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\nS2 smoke: all good");
assert.equal(failed, 0);
