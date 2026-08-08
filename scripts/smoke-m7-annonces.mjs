const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const PASS = "ImplantolabDev1!";
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://implantolab:implantolab@localhost:5432/implantolab";

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

async function login(email) {
  const r = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email, password: PASS },
  });
  ok(
    `login ${email}`,
    r.status === 200 && Boolean(r.data?.token),
    `HTTP ${r.status}${r.data?.error ? ` ${r.data.error}` : ""}`,
  );
  return r.data;
}

function futureExpiresAt(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function pastExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}

console.log(`Smoke M7 against ${BASE}\n`);

const admin = await login("admin@local.dev");
if (!admin?.token) process.exit(1);

const prac = await login("praticien@local.dev");
if (!prac?.token) process.exit(1);

// Cleanup leftover smoke announcements (idempotent).
{
  const postgres = await import("postgres");
  const sql = postgres.default(DATABASE_URL, { max: 1 });
  try {
    await sql`
      delete from public.admin_announcements
       where title like 'Smoke M7%'
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const title = "Smoke M7 — annonce active";
const body = "Message smoke test dual-mode annonces.";
const expiresAt = futureExpiresAt(7);

let announcementId = null;
{
  const created = await api("/api/v1/announcements", {
    method: "POST",
    token: admin.token,
    body: { title, body, expiresAt },
  });
  ok(
    "POST announcement (admin)",
    created.status === 201 && Boolean(created.data?.id),
    `HTTP ${created.status} ${JSON.stringify(created.data)}`,
  );
  announcementId = created.data?.id;
}

if (!announcementId) process.exit(1);

{
  const list = await api("/api/v1/announcements", { token: admin.token });
  ok(
    "GET all announcements (admin)",
    list.status === 200 && Array.isArray(list.data?.announcements),
    `n=${list.data?.announcements?.length ?? "?"}`,
  );
  const found = (list.data?.announcements ?? []).find(
    (r) => r.id === announcementId,
  );
  ok("admin list contains new announcement", Boolean(found), announcementId);
}

{
  const list = await api("/api/v1/announcements", { token: prac.token });
  ok(
    "GET active announcements (praticien)",
    list.status === 200 && Array.isArray(list.data?.announcements),
    `n=${list.data?.announcements?.length ?? "?"}`,
  );
  const found = (list.data?.announcements ?? []).find(
    (r) => r.id === announcementId,
  );
  ok("praticien sees active announcement", Boolean(found), announcementId);
  ok("title/body match", found?.title === title && found?.body === body);
}

{
  const forbidden = await api("/api/v1/announcements", {
    method: "POST",
    token: prac.token,
    body: {
      title: "Smoke M7 praticien should fail",
      body: "nope",
      expiresAt: futureExpiresAt(),
    },
  });
  ok(
    "POST announcement forbidden for praticien",
    forbidden.status === 403,
    `HTTP ${forbidden.status}`,
  );
}

{
  const pro = await login("prothesiste@local.dev");
  if (pro?.token) {
    const listForbidden = await api("/api/v1/announcements", {
      token: pro.token,
    });
    ok(
      "GET announcements forbidden for prothesiste",
      listForbidden.status === 403,
      `HTTP ${listForbidden.status}`,
    );

    const postForbidden = await api("/api/v1/announcements", {
      method: "POST",
      token: pro.token,
      body: {
        title: "Smoke M7 prothesiste",
        body: "nope",
        expiresAt: futureExpiresAt(),
      },
    });
    ok(
      "POST announcement forbidden for prothesiste",
      postForbidden.status === 403,
      `HTTP ${postForbidden.status}`,
    );
  }
}

{
  const badExpires = await api("/api/v1/announcements", {
    method: "POST",
    token: admin.token,
    body: {
      title: "Smoke M7 — past expiry",
      body: "should fail",
      expiresAt: pastExpiresAt(),
    },
  });
  ok(
    "POST announcement past expires → 400",
    badExpires.status === 400 && badExpires.data?.error === "expires",
    `HTTP ${badExpires.status} ${JSON.stringify(badExpires.data)}`,
  );
}

// Insert an already-expired row; praticien must not see it, admin must.
let expiredId = null;
{
  const postgres = await import("postgres");
  const sql = postgres.default(DATABASE_URL, { max: 1 });
  try {
    const rows = await sql`
      insert into public.admin_announcements (title, body, created_by, created_at, expires_at)
      values (
        'Smoke M7 — expired',
        'Should be hidden from praticien',
        ${admin.profile.id}::uuid,
        now() - interval '2 days',
        now() - interval '1 day'
      )
      returning id::text
    `;
    expiredId = rows[0]?.id ?? null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (expiredId) {
  const adminList = await api("/api/v1/announcements", { token: admin.token });
  const adminSees = (adminList.data?.announcements ?? []).some(
    (r) => r.id === expiredId,
  );
  ok("admin sees expired announcement", adminSees, expiredId);

  const pracList = await api("/api/v1/announcements", { token: prac.token });
  const pracSees = (pracList.data?.announcements ?? []).some(
    (r) => r.id === expiredId,
  );
  ok("praticien does NOT see expired", !pracSees, expiredId);
}

{
  const del = await api(`/api/v1/announcements/${announcementId}`, {
    method: "DELETE",
    token: admin.token,
  });
  ok(
    "DELETE announcement (admin)",
    del.status === 200 && del.data?.deleted === true,
    JSON.stringify(del.data),
  );
}

{
  const list = await api("/api/v1/announcements", { token: prac.token });
  const stillThere = (list.data?.announcements ?? []).some(
    (r) => r.id === announcementId,
  );
  ok("announcement removed from praticien list", !stillThere, announcementId);
}

{
  const delForbidden = await api(`/api/v1/announcements/${announcementId}`, {
    method: "DELETE",
    token: prac.token,
  });
  ok(
    "DELETE forbidden for praticien",
    delForbidden.status === 403,
    `HTTP ${delForbidden.status}`,
  );
}

{
  const missing = await api(`/api/v1/announcements/${announcementId}`, {
    method: "DELETE",
    token: admin.token,
  });
  ok(
    "DELETE missing → 404",
    missing.status === 404,
    `HTTP ${missing.status}`,
  );
}

// Cleanup expired smoke row.
if (expiredId) {
  const postgres = await import("postgres");
  const sql = postgres.default(DATABASE_URL, { max: 1 });
  try {
    await sql`
      delete from public.admin_announcements
       where id = ${expiredId}::uuid
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

console.log(`\nDone. exitCode=${process.exitCode ?? 0}`);
