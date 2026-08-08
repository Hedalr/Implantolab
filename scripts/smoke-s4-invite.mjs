/**
 * Smoke S4 — invite / accept / set-password.
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s4-invite.mjs
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
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
const ADMIN_EMAIL = "admin@local.dev";
const ADMIN_PASS = "ImplantolabDev1!";
const stamp = Date.now();
const INVITE_EMAIL = `smoke-s4-${stamp}@local.dev`;
const GOOD_PASS = "ImplantolabS4ok1!";
const WEAK_PASS = "short1!"; // < 10
const LETTERS_ONLY = "abcdefghij"; // 10 letters, no digit

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

/** L’API RH ne renvoie plus le token brut — mint connu en DB pour les smokes. */
async function overwriteInviteToken(sql, userId) {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    update public.users
       set invite_token_hash = ${hash},
           invite_token_expires_at = ${expires}::timestamptz
     where id = ${userId}::uuid
  `;
  return raw;
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

// --- Source guards -----------------------------------------------------------
const rhSrc = read("lib/rh/pg.ts");
const acceptSrc = read("app/api/v1/auth/accept-invite/route.ts");
const setPwSrc = read("app/api/v1/auth/set-password/route.ts");
const inviteRouteSrc = read("app/espace-praticien/auth/invite/route.ts");
const authSrc = read("lib/api/v1/auth.ts");
const proxySrc = read("proxy.ts");
const inviteEmailSrc = read("lib/email/invite.ts");

check(
  "consumeInviteOrResetTokenPg exists (atomic single-use)",
  rhSrc.includes("consumeInviteOrResetTokenPg") &&
    rhSrc.includes("invite_token_hash = null") &&
    /update public\.users[\s\S]*invite_token_hash = null[\s\S]*returning id/m.test(
      rhSrc,
    ),
);
check(
  "acceptInviteTokenPg consumes then mints session",
  rhSrc.includes("acceptInviteTokenPg") &&
    /export async function acceptInviteTokenPg[\s\S]*consumeInviteOrResetTokenPg[\s\S]*createPgSessionToken/m.test(
      rhSrc,
    ),
);
check(
  "set-password API uses consume (not accept mint)",
  setPwSrc.includes("consumeInviteOrResetTokenPg") &&
    !setPwSrc.includes("acceptInviteTokenPg"),
);
check(
  "password policy ≥10 + letter + digit",
  rhSrc.includes("MIN_PASSWORD_LENGTH = 10") &&
    rhSrc.includes("password-weak") &&
    rhSrc.includes("checkPasswordPolicy"),
);
check(
  "setPasswordPg clears invite+reset hashes",
  /set password_hash[\s\S]*invite_token_hash = null[\s\S]*password_reset_token_hash = null/m.test(
    rhSrc,
  ),
);
check(
  "setPasswordPg invalidates other sessions",
  rhSrc.includes("keepSessionToken") &&
    /delete from public\.sessions[\s\S]*user_id/m.test(rhSrc),
);
check(
  "reactivate forces new password (unusable hash + email_confirmed null)",
  /reactivateUserPg[\s\S]*unusablePasswordHash[\s\S]*email_confirmed_at = null/m.test(
    rhSrc,
  ),
);
check(
  "API gate password_required when pending",
  authSrc.includes("password_required") &&
    authSrc.includes("allowPasswordPending"),
);
check(
  "proxy redirects mustSetPassword → set-password",
  proxySrc.includes("mustSetPassword") &&
    proxySrc.includes("/espace-praticien/set-password"),
);
check(
  "web invite route still accepts then redirects",
  inviteRouteSrc.includes("acceptInviteTokenPg") &&
    inviteRouteSrc.includes("set-password"),
);
check(
  "accept-invite route wired",
  acceptSrc.includes("acceptInviteTokenPg"),
);
check(
  "invite email log omits full URL when RESEND absent",
  (() => {
    const m = inviteEmailSrc.match(
      /if\s*\(\s*!isResendConfigured\(\)\s*\)\s*\{[\s\S]*?return\s*\{\s*sent:\s*false\s*\}/,
    );
    return (
      Boolean(m) &&
      m[0].includes("invite créée, email skipped") &&
      !m[0].includes("inviteUrl") &&
      !m[0].includes("params.inviteUrl")
    );
  })(),
);

// --- Runtime -----------------------------------------------------------------
const sql = postgres(databaseUrl, { max: 1 });
let userId = null;
let inviteToken = null;

try {
  const adminLogin = await fetchJson("/api/v1/auth/login", {
    method: "POST",
    body: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  check(
    "admin login",
    adminLogin.status === 200 && Boolean(adminLogin.data?.token),
    `status=${adminLogin.status}`,
  );
  const adminToken = adminLogin.data?.token;
  if (!adminToken) throw new Error("abort: no admin token");

  const invited = await fetchJson("/api/v1/rh/users", {
    method: "POST",
    token: adminToken,
    body: {
      email: INVITE_EMAIL,
      fullName: "Smoke S4",
      role: "practitioner",
    },
  });
  check(
    "POST invite user",
    invited.status === 201 || invited.status === 200,
    `status=${invited.status} ${JSON.stringify(invited.data)}`,
  );
  userId = invited.data?.id ?? invited.data?.userId;
  if (!userId) {
    throw new Error(
      `abort: invite missing id — ${JSON.stringify(invited.data)}`,
    );
  }
  check(
    "invite response omits cleartext token/url",
    !("inviteToken" in (invited.data ?? {})) &&
      !("inviteUrl" in (invited.data ?? {})),
    JSON.stringify(invited.data),
  );
  inviteToken = await overwriteInviteToken(sql, userId);

  // 1) First accept → session + token consumed
  const accept1 = await fetchJson("/api/v1/auth/accept-invite", {
    method: "POST",
    body: { token: inviteToken },
  });
  check(
    "accept-invite #1 → 200 + bearer",
    accept1.status === 200 && Boolean(accept1.data?.token),
    `status=${accept1.status}`,
  );
  const pendingToken = accept1.data?.token;
  if (!pendingToken) throw new Error("abort: no pending session");

  // 2) Reuse invite after accept (before set-password) → reject
  const accept2 = await fetchJson("/api/v1/auth/accept-invite", {
    method: "POST",
    body: { token: inviteToken },
  });
  check(
    "reuse invite after accept → 400 token-invalid",
    accept2.status === 400 && accept2.data?.error === "token-invalid",
    `status=${accept2.status} body=${JSON.stringify(accept2.data)}`,
  );

  // 3) Pending session cannot access app APIs
  const mePending = await fetchJson("/api/v1/me", { token: pendingToken });
  check(
    "session before set-password → /me 403 password_required",
    mePending.status === 403 && mePending.data?.error === "password_required",
    `status=${mePending.status} body=${JSON.stringify(mePending.data)}`,
  );

  // 4) Policy: short / weak / mismatch
  const short = await fetchJson("/api/v1/auth/set-password", {
    method: "POST",
    token: pendingToken,
    body: { password: WEAK_PASS, confirm: WEAK_PASS },
  });
  check(
    "password < 10 → 400 password-short",
    short.status === 400 && short.data?.error === "password-short",
    `status=${short.status} body=${JSON.stringify(short.data)}`,
  );

  const weak = await fetchJson("/api/v1/auth/set-password", {
    method: "POST",
    token: pendingToken,
    body: { password: LETTERS_ONLY, confirm: LETTERS_ONLY },
  });
  check(
    "password letters-only → 400 password-weak",
    weak.status === 400 && weak.data?.error === "password-weak",
    `status=${weak.status} body=${JSON.stringify(weak.data)}`,
  );

  const mismatch = await fetchJson("/api/v1/auth/set-password", {
    method: "POST",
    token: pendingToken,
    body: { password: GOOD_PASS, confirm: `${GOOD_PASS}x` },
  });
  check(
    "mismatch rejected → 400 password-mismatch",
    mismatch.status === 400 && mismatch.data?.error === "password-mismatch",
    `status=${mismatch.status} body=${JSON.stringify(mismatch.data)}`,
  );

  // 5) set-password via session clears invite+reset hashes
  const setOk = await fetchJson("/api/v1/auth/set-password", {
    method: "POST",
    token: pendingToken,
    body: { password: GOOD_PASS, confirm: GOOD_PASS },
  });
  check(
    "set-password via session → 200",
    setOk.status === 200 && setOk.data?.ok === true,
    `status=${setOk.status} body=${JSON.stringify(setOk.data)}`,
  );

  const hashes = await sql`
    select invite_token_hash,
           invite_token_expires_at,
           password_reset_token_hash,
           password_reset_expires_at,
           email_confirmed_at
      from public.users
     where id = ${userId}::uuid
     limit 1
  `;
  const h = hashes[0];
  check(
    "set-password cleared invite+reset hashes",
    h?.invite_token_hash == null &&
      h?.invite_token_expires_at == null &&
      h?.password_reset_token_hash == null &&
      h?.password_reset_expires_at == null &&
      h?.email_confirmed_at != null,
    JSON.stringify(h),
  );

  const meOk = await fetchJson("/api/v1/me", { token: pendingToken });
  check(
    "same session after set-password → /me 200",
    meOk.status === 200,
    `status=${meOk.status}`,
  );

  // 6) Expired invite → 410
  const expiredEmail = `smoke-s4-exp-${stamp}@local.dev`;
  const expiredInvite = await fetchJson("/api/v1/rh/users", {
    method: "POST",
    token: adminToken,
    body: {
      email: expiredEmail,
      fullName: "Smoke S4 Exp",
      role: "practitioner",
    },
  });
  const expiredUserId = expiredInvite.data?.id ?? expiredInvite.data?.userId;
  const expiredToken = expiredUserId
    ? await overwriteInviteToken(sql, expiredUserId)
    : null;
  check(
    "invite expired fixture created",
    Boolean(expiredUserId && expiredToken),
    `status=${expiredInvite.status}`,
  );
  if (expiredUserId && expiredToken) {
    await sql`
      update public.users
         set invite_token_expires_at = now() - interval '1 minute'
       where id = ${expiredUserId}::uuid
    `;
    const expiredAccept = await fetchJson("/api/v1/auth/accept-invite", {
      method: "POST",
      body: { token: expiredToken },
    });
    check(
      "invite expirée → 410 token-expired",
      expiredAccept.status === 410 &&
        expiredAccept.data?.error === "token-expired",
      `status=${expiredAccept.status} body=${JSON.stringify(expiredAccept.data)}`,
    );

    // Cleanup expired fixture
    await sql`delete from public.users where id = ${expiredUserId}::uuid`;
  }

  // 7) set-password via invite token (no prior accept) + no orphan multi-mint
  const tokenOnlyEmail = `smoke-s4-tok-${stamp}@local.dev`;
  const tokenOnlyInvite = await fetchJson("/api/v1/rh/users", {
    method: "POST",
    token: adminToken,
    body: {
      email: tokenOnlyEmail,
      fullName: "Smoke S4 Tok",
      role: "practitioner",
    },
  });
  const tokenOnlyUserId =
    tokenOnlyInvite.data?.id ?? tokenOnlyInvite.data?.userId;
  const tokenOnlyToken = tokenOnlyUserId
    ? await overwriteInviteToken(sql, tokenOnlyUserId)
    : null;
  check(
    "token-only fixture created",
    Boolean(tokenOnlyUserId && tokenOnlyToken),
    `status=${tokenOnlyInvite.status}`,
  );
  if (tokenOnlyUserId && tokenOnlyToken) {
    const setViaToken = await fetchJson("/api/v1/auth/set-password", {
      method: "POST",
      body: {
        token: tokenOnlyToken,
        password: GOOD_PASS,
        confirm: GOOD_PASS,
      },
    });
    check(
      "set-password via invite token (no accept) → 200",
      setViaToken.status === 200 && setViaToken.data?.ok === true,
      `status=${setViaToken.status}`,
    );

    const reuseToken = await fetchJson("/api/v1/auth/set-password", {
      method: "POST",
      body: {
        token: tokenOnlyToken,
        password: GOOD_PASS,
        confirm: GOOD_PASS,
      },
    });
    check(
      "reuse invite token after set-password → 400",
      reuseToken.status === 400 && reuseToken.data?.error === "token-invalid",
      `status=${reuseToken.status} body=${JSON.stringify(reuseToken.data)}`,
    );

    const sessionCount = await sql`
      select count(*)::int as n from public.sessions
       where user_id = ${tokenOnlyUserId}::uuid
    `;
    check(
      "set-password via token leaves no orphan session",
      sessionCount[0]?.n === 0,
      `sessions=${sessionCount[0]?.n}`,
    );

    await sql`delete from public.users where id = ${tokenOnlyUserId}::uuid`;
  }

  // Cleanup primary invitee
  if (userId) {
    await sql`delete from public.users where id = ${userId}::uuid`;
  }
} catch (err) {
  failed += 1;
  console.error(`FAIL runtime — ${err.message}`);
  if (userId) {
    try {
      await sql`delete from public.users where id = ${userId}::uuid`;
    } catch {
      // ignore cleanup errors
    }
  }
} finally {
  await sql.end({ timeout: 5 });
}

if (failed > 0) {
  console.error(`\nS4 smoke: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\nS4 smoke: all good");
assert.equal(failed, 0);
