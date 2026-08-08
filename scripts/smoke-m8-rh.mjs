import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const PASS = "ImplantolabDev1!";
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://implantolab:implantolab@localhost:5432/implantolab";

const SMOKE_EMAIL = `smoke-m8-${Date.now()}@local.dev`;
const SMOKE_SECTOR = `Smoke M8 ${Date.now()}`;
const NEW_PASS = "ImplantolabSmoke8!";

/** L’API RH ne renvoie plus le token brut — mint connu en DB pour les smokes. */
async function overwriteInviteToken(sql, userId) {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    update public.users
       set invite_token_hash = ${hash},
           invite_token_expires_at = ${expires}::timestamptz,
           password_reset_token_hash = null,
           password_reset_expires_at = null
     where id = ${userId}::uuid
  `;
  return raw;
}

async function overwriteResetToken(sql, userId) {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    update public.users
       set password_reset_token_hash = ${hash},
           password_reset_expires_at = ${expires}::timestamptz,
           invite_token_hash = null,
           invite_token_expires_at = null
     where id = ${userId}::uuid
  `;
  return raw;
}

async function api(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function ok(label, cond, detail = "") {
  console.log((cond ? "PASS" : "FAIL").padEnd(4), label, detail);
  if (!cond) process.exitCode = 1;
}

async function login(email, password = PASS) {
  const r = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  ok(
    `login ${email}`,
    r.status === 200 && Boolean(r.data?.token),
    `HTTP ${r.status}${r.data?.error ? ` ${r.data.error}` : ""}`,
  );
  return r.data;
}

console.log(`Smoke M8 RH against ${BASE}\n`);

const admin = await login("admin@local.dev");
if (!admin?.token) process.exit(1);

const prac = await login("praticien@local.dev");
if (!prac?.token) process.exit(1);

const sql = postgres(DATABASE_URL, { max: 1 });

// Cleanup leftover smoke sectors / users (idempotent).
{
  try {
    await sql`
      delete from public.users
       where email like 'smoke-m8-%@local.dev'
    `;
    await sql`
      delete from public.sectors
       where name like 'Smoke M8%'
    `;
  } catch (err) {
    console.warn("cleanup warn", err.message);
  }
}

let sectorId = null;
{
  const forbidden = await api("/api/v1/rh/sectors", {
    method: "POST",
    token: prac.token,
    body: { name: SMOKE_SECTOR, color: "#2563eb" },
  });
  ok(
    "POST sector forbidden (praticien)",
    forbidden.status === 403,
    `HTTP ${forbidden.status}`,
  );
}

{
  const created = await api("/api/v1/rh/sectors", {
    method: "POST",
    token: admin.token,
    body: { name: SMOKE_SECTOR, color: "#2563eb" },
  });
  ok(
    "POST sector (admin)",
    created.status === 201 && Boolean(created.data?.id),
    `HTTP ${created.status} ${JSON.stringify(created.data)}`,
  );
  sectorId = created.data?.id;
}

if (!sectorId) process.exit(1);

{
  const list = await api("/api/v1/rh/sectors", { token: admin.token });
  ok(
    "GET sectors (admin)",
    list.status === 200 &&
      Array.isArray(list.data?.sectors) &&
      list.data.sectors.some((s) => s.id === sectorId),
    `n=${list.data?.sectors?.length ?? "?"}`,
  );
}

{
  const patched = await api(`/api/v1/rh/sectors/${sectorId}`, {
    method: "PATCH",
    token: admin.token,
    body: { name: `${SMOKE_SECTOR} upd`, color: "#16a34a" },
  });
  ok("PATCH sector", patched.status === 200, `HTTP ${patched.status}`);
}

let userId = null;
let inviteToken = null;
{
  const invited = await api("/api/v1/rh/users", {
    method: "POST",
    token: admin.token,
    body: {
      email: SMOKE_EMAIL,
      fullName: "Smoke M8 Praticien",
      role: "practitioner",
    },
  });
  ok(
    "POST invite practitioner",
    invited.status === 201 && Boolean(invited.data?.id),
    `HTTP ${invited.status} ${JSON.stringify({
      id: invited.data?.id,
      email: invited.data?.email,
      hasTokenLeak:
        "inviteToken" in (invited.data ?? {}) ||
        "inviteUrl" in (invited.data ?? {}),
    })}`,
  );
  ok(
    "invite omits cleartext token/url",
    !("inviteToken" in (invited.data ?? {})) &&
      !("inviteUrl" in (invited.data ?? {})),
  );
  userId = invited.data?.id;

  {
    const resent = await api(`/api/v1/rh/users/${userId}`, {
      method: "PATCH",
      token: admin.token,
      body: { action: "resend-invite" },
    });
    ok(
      "PATCH resend-invite",
      resent.status === 200 && resent.data?.ok === true,
      `HTTP ${resent.status}`,
    );
    ok(
      "resend-invite omits cleartext token/url",
      !("inviteToken" in (resent.data ?? {})) &&
        !("inviteUrl" in (resent.data ?? {})) &&
        typeof resent.data?.emailSent === "boolean",
    );
  }

  inviteToken = userId ? await overwriteInviteToken(sql, userId) : null;
}

if (!userId || !inviteToken) process.exit(1);

{
  const dup = await api("/api/v1/rh/users", {
    method: "POST",
    token: admin.token,
    body: { email: SMOKE_EMAIL, role: "practitioner" },
  });
  ok(
    "POST invite duplicate → 400",
    dup.status === 400 && dup.data?.error === "invite-exists",
    `HTTP ${dup.status} ${dup.data?.error}`,
  );
}

{
  const before = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email: SMOKE_EMAIL, password: NEW_PASS },
  });
  ok(
    "login before set-password fails",
    before.status === 401,
    `HTTP ${before.status}`,
  );
}

{
  const setPw = await api("/api/v1/auth/set-password", {
    method: "POST",
    body: {
      token: inviteToken,
      password: NEW_PASS,
      confirm: NEW_PASS,
    },
  });
  ok(
    "POST set-password via invite token",
    setPw.status === 200 && setPw.data?.ok === true,
    `HTTP ${setPw.status} ${JSON.stringify(setPw.data)}`,
  );
}

const invitedLogin = await login(SMOKE_EMAIL, NEW_PASS);
if (!invitedLogin?.token) process.exit(1);

{
  const soft = await api(`/api/v1/rh/users/${userId}`, {
    method: "PATCH",
    token: admin.token,
    body: { action: "soft-delete" },
  });
  ok(
    "PATCH soft-delete",
    soft.status === 200 && soft.data?.ok === true,
    `HTTP ${soft.status}`,
  );
}

{
  // Soft-delete sets deleted_at (+ permanent ban). Login must not leak
  // existence via 403 banned — same shape as bad password (S3 anti-enum).
  const deletedLogin = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email: SMOKE_EMAIL, password: NEW_PASS },
  });
  ok(
    "login after soft-delete → invalid_credentials",
    deletedLogin.status === 401 &&
      deletedLogin.data?.error === "invalid_credentials",
    `HTTP ${deletedLogin.status} ${deletedLogin.data?.error}`,
  );
}

let resetToken = null;
{
  const reactivated = await api(`/api/v1/rh/users/${userId}`, {
    method: "PATCH",
    token: admin.token,
    body: { action: "reactivate" },
  });
  ok(
    "PATCH reactivate",
    reactivated.status === 200 && reactivated.data?.ok === true,
    `HTTP ${reactivated.status}`,
  );
  ok(
    "reactivate omits cleartext resetToken/url",
    !("resetToken" in (reactivated.data ?? {})) &&
      !("inviteUrl" in (reactivated.data ?? {})),
  );
  resetToken =
    reactivated.status === 200
      ? await overwriteResetToken(sql, userId)
      : null;
}

if (resetToken) {
  const setPw2 = await api("/api/v1/auth/set-password", {
    method: "POST",
    body: {
      token: resetToken,
      password: NEW_PASS,
      confirm: NEW_PASS,
    },
  });
  ok(
    "set-password after reactivate",
    setPw2.status === 200,
    `HTTP ${setPw2.status}`,
  );
  await login(SMOKE_EMAIL, NEW_PASS);
}

{
  const softAgain = await api(`/api/v1/rh/users/${userId}`, {
    method: "PATCH",
    token: admin.token,
    body: { action: "soft-delete" },
  });
  ok("soft-delete before permanent", softAgain.status === 200);

  const gone = await api(`/api/v1/rh/users/${userId}`, {
    method: "DELETE",
    token: admin.token,
  });
  ok(
    "DELETE permanently",
    gone.status === 200 && gone.data?.ok === true,
    `HTTP ${gone.status}`,
  );
}

{
  const reinvite = await api("/api/v1/rh/users", {
    method: "POST",
    token: admin.token,
    body: {
      email: SMOKE_EMAIL,
      fullName: "Smoke M8 Reinvite",
      role: "practitioner",
    },
  });
  ok(
    "re-invite same email after permanent delete",
    reinvite.status === 201 && Boolean(reinvite.data?.id),
    `HTTP ${reinvite.status}`,
  );
  userId = reinvite.data?.id;
}

// Lab invite + sector assign
let labUserId = null;
const SMOKE_LAB_EMAIL = `smoke-m8-lab-${Date.now()}@local.dev`;
{
  const invited = await api("/api/v1/rh/users", {
    method: "POST",
    token: admin.token,
    body: {
      email: SMOKE_LAB_EMAIL,
      fullName: "Smoke M8 Lab",
      role: "prosthetist",
      sectorId,
    },
  });
  ok(
    "POST invite prosthetist + sector",
    invited.status === 201 && Boolean(invited.data?.id),
    `HTTP ${invited.status}`,
  );
  labUserId = invited.data?.id;

  if (labUserId) {
    const labInviteToken = await overwriteInviteToken(sql, labUserId);
    await api("/api/v1/auth/set-password", {
      method: "POST",
      body: {
        token: labInviteToken,
        password: NEW_PASS,
        confirm: NEW_PASS,
      },
    });

    const balance = await api(`/api/v1/rh/users/${labUserId}`, {
      method: "PATCH",
      token: admin.token,
      body: { action: "leave-balance", leaveBalanceDays: 12 },
    });
    ok(
      "PATCH leave-balance",
      balance.status === 200,
      `HTTP ${balance.status}`,
    );

    const labList = await api("/api/v1/rh/users?scope=lab", {
      token: admin.token,
    });
    const found = (labList.data?.users ?? []).find((u) => u.id === labUserId);
    ok(
      "GET lab users contains invitee",
      labList.status === 200 && Boolean(found) && found.leave_balance_days === 12,
      `balance=${found?.leave_balance_days}`,
    );
  }
}

{
  const deleted = await api(`/api/v1/rh/sectors/${sectorId}`, {
    method: "DELETE",
    token: admin.token,
  });
  ok("DELETE sector", deleted.status === 200, `HTTP ${deleted.status}`);
}

// Cleanup smoke users
{
  try {
    await sql`
      delete from public.users
       where email like 'smoke-m8-%@local.dev'
    `;
    await sql`
      delete from public.sectors
       where name like 'Smoke M8%'
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

console.log("\nSmoke M8 done.");
process.exit(process.exitCode ?? 0);
