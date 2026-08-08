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

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

console.log(`Smoke M6 against ${BASE}\n`);

const admin = await login("admin@local.dev");
if (!admin?.token) process.exit(1);

const prac = await login("praticien@local.dev");
if (!prac?.token) process.exit(1);

// Cleanup leftover smoke closures (idempotent).
{
  const postgres = await import("postgres");
  const sql = postgres.default(DATABASE_URL, { max: 1 });
  try {
    await sql`
      delete from public.closure_periods
       where profile_id = ${prac.profile.id}::uuid
         and note like 'Smoke M6%'
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const startDate = isoDate(20);
const endDate = isoDate(22);

let closureId = null;
{
  const created = await api("/api/v1/closure-periods", {
    method: "POST",
    token: prac.token,
    body: {
      startDate,
      endDate,
      note: "Smoke M6 — fermeture praticien",
    },
  });
  ok(
    "POST closure (praticien)",
    created.status === 201 && Boolean(created.data?.id),
    `HTTP ${created.status} ${JSON.stringify(created.data)}`,
  );
  closureId = created.data?.id;
}

if (!closureId) process.exit(1);

{
  const list = await api("/api/v1/closure-periods", { token: prac.token });
  ok(
    "GET my closures (praticien)",
    list.status === 200 && Array.isArray(list.data?.closure_periods),
    `n=${list.data?.closure_periods?.length ?? "?"}`,
  );
  const mine = (list.data?.closure_periods ?? []).find((r) => r.id === closureId);
  ok("list contains new closure", Boolean(mine), closureId);
  ok(
    "dates match",
    mine?.start_date === startDate && mine?.end_date === endDate,
    `${mine?.start_date}→${mine?.end_date}`,
  );
}

{
  const adminList = await api("/api/v1/closure-periods", { token: admin.token });
  ok(
    "GET all closures (admin calendar)",
    adminList.status === 200 && Array.isArray(adminList.data?.closure_periods),
    `n=${adminList.data?.closure_periods?.length ?? "?"}`,
  );
  const found = (adminList.data?.closure_periods ?? []).find(
    (r) => r.id === closureId,
  );
  ok("admin list contains praticien closure", Boolean(found), closureId);
  ok(
    "admin sees profile_name",
    Boolean(found?.profile_name),
    found?.profile_name ?? "null",
  );
}

{
  const forbidden = await api("/api/v1/closure-periods", {
    method: "POST",
    token: admin.token,
    body: { startDate, endDate, note: "Smoke M6 admin should fail" },
  });
  ok(
    "POST closure forbidden for admin",
    forbidden.status === 403,
    `HTTP ${forbidden.status}`,
  );
}

{
  const pro = await login("prothesiste@local.dev");
  if (pro?.token) {
    const forbidden = await api("/api/v1/closure-periods", {
      method: "POST",
      token: pro.token,
      body: { startDate, endDate, note: "Smoke M6 prothesiste" },
    });
    ok(
      "POST closure forbidden for prothesiste",
      forbidden.status === 403,
      `HTTP ${forbidden.status}`,
    );

    const listForbidden = await api("/api/v1/closure-periods", {
      token: pro.token,
    });
    ok(
      "GET closures forbidden for prothesiste",
      listForbidden.status === 403,
      `HTTP ${listForbidden.status}`,
    );
  }
}

{
  const badOrder = await api("/api/v1/closure-periods", {
    method: "POST",
    token: prac.token,
    body: {
      startDate: endDate,
      endDate: startDate,
      note: "Smoke M6 — bad order",
    },
  });
  ok(
    "POST closure bad order → 400",
    badOrder.status === 400 && badOrder.data?.error === "order",
    `HTTP ${badOrder.status} ${JSON.stringify(badOrder.data)}`,
  );
}

{
  const del = await api(`/api/v1/closure-periods/${closureId}`, {
    method: "DELETE",
    token: prac.token,
  });
  ok(
    "DELETE closure (praticien)",
    del.status === 200 && del.data?.deleted === true,
    JSON.stringify(del.data),
  );
}

{
  const list = await api("/api/v1/closure-periods", { token: prac.token });
  const stillThere = (list.data?.closure_periods ?? []).some(
    (r) => r.id === closureId,
  );
  ok("closure removed from list", !stillThere, closureId);

  const adminList = await api("/api/v1/closure-periods", { token: admin.token });
  const stillAdmin = (adminList.data?.closure_periods ?? []).some(
    (r) => r.id === closureId,
  );
  ok("closure removed from admin calendar", !stillAdmin, closureId);
}

{
  const missing = await api(`/api/v1/closure-periods/${closureId}`, {
    method: "DELETE",
    token: prac.token,
  });
  ok(
    "DELETE missing → 404",
    missing.status === 404,
    `HTTP ${missing.status}`,
  );
}

console.log(`\nDone. exitCode=${process.exitCode ?? 0}`);
