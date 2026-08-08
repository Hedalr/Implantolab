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

console.log(`Smoke M5 against ${BASE}\n`);

const admin = await login("admin@local.dev");
if (!admin?.token) process.exit(1);

const pro = await login("prothesiste@local.dev");
if (!pro?.token) process.exit(1);

const chef = await login("chef@local.dev");
if (!chef?.token) process.exit(1);

const proBalance = pro.profile?.leaveBalanceDays ?? 0;
ok("prothesiste leave balance > 0", proBalance > 0, `balance=${proBalance}`);

// Cleanup leftover smoke leaves for prothesiste (idempotent).
{
  const postgres = await import("postgres");
  const sql = postgres.default(DATABASE_URL, { max: 1 });
  try {
    await sql`
      delete from public.leave_requests
       where profile_id = ${pro.profile.id}::uuid
         and note like 'Smoke M5%'
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const startDate = isoDate(30);
const endDate = isoDate(32);
const daysExpected = 3;

let leaveId = null;
{
  const created = await api("/api/v1/leave-requests", {
    method: "POST",
    token: pro.token,
    body: {
      startDate,
      endDate,
      note: "Smoke M5 — demande pending",
    },
  });
  ok(
    "POST leave (prothesiste)",
    created.status === 201 && Boolean(created.data?.id),
    `HTTP ${created.status} ${JSON.stringify(created.data)}`,
  );
  leaveId = created.data?.id;
}

if (!leaveId) process.exit(1);

{
  const list = await api("/api/v1/leave-requests", { token: pro.token });
  ok(
    "GET my leaves (prothesiste)",
    list.status === 200 && Array.isArray(list.data?.leave_requests),
    `n=${list.data?.leave_requests?.length ?? "?"}`,
  );
  const mine = (list.data?.leave_requests ?? []).find((r) => r.id === leaveId);
  ok("list contains new leave", Boolean(mine), leaveId);
  ok("status pending", mine?.status === "pending", mine?.status);
  ok(
    "days_count from trigger",
    mine?.days_count === daysExpected,
    `days=${mine?.days_count}`,
  );
}

{
  const adminList = await api("/api/v1/leave-requests", { token: admin.token });
  ok(
    "GET all leaves (admin)",
    adminList.status === 200 && Array.isArray(adminList.data?.leave_requests),
    `n=${adminList.data?.leave_requests?.length ?? "?"}`,
  );
  const found = (adminList.data?.leave_requests ?? []).some(
    (r) => r.id === leaveId,
  );
  ok("admin list contains pending leave", found, leaveId);
}

{
  const forbidden = await api("/api/v1/leave-requests", {
    method: "POST",
    token: admin.token,
    body: { startDate, endDate, note: "Smoke M5 admin should fail" },
  });
  ok(
    "POST leave forbidden for admin",
    forbidden.status === 403,
    `HTTP ${forbidden.status}`,
  );
}

{
  const prac = await login("praticien@local.dev");
  if (prac?.token) {
    const forbidden = await api("/api/v1/leave-requests", {
      method: "POST",
      token: prac.token,
      body: { startDate, endDate, note: "Smoke M5 praticien" },
    });
    ok(
      "POST leave forbidden for praticien",
      forbidden.status === 403,
      `HTTP ${forbidden.status}`,
    );
  }
}

{
  const approve = await api(`/api/v1/leave-requests/${leaveId}`, {
    method: "PATCH",
    token: admin.token,
    body: { status: "approved" },
  });
  ok(
    "PATCH approve (admin)",
    approve.status === 200 && approve.data?.status === "approved",
    JSON.stringify(approve.data),
  );
}

{
  const list = await api("/api/v1/leave-requests", { token: pro.token });
  const mine = (list.data?.leave_requests ?? []).find((r) => r.id === leaveId);
  ok("leave now approved", mine?.status === "approved", mine?.status);

  const approvedDays = (list.data?.leave_requests ?? [])
    .filter((r) => r.status === "approved")
    .reduce((acc, r) => acc + (r.days_count ?? 0), 0);
  const pendingDays = (list.data?.leave_requests ?? [])
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + (r.days_count ?? 0), 0);
  const remaining = Math.max(proBalance - approvedDays - pendingDays, 0);
  ok(
    "solde cohérent après approve",
    remaining === proBalance - approvedDays - pendingDays,
    `balance=${proBalance} approved=${approvedDays} pending=${pendingDays} remaining=${remaining}`,
  );
}

{
  const cannotCancel = await api(`/api/v1/leave-requests/${leaveId}`, {
    method: "DELETE",
    token: pro.token,
  });
  ok(
    "DELETE approved forbidden for owner",
    cannotCancel.status === 404,
    `HTTP ${cannotCancel.status}`,
  );
}

// Second leave → reject path
const start2 = isoDate(40);
const end2 = isoDate(40);
let leaveId2 = null;
{
  const created = await api("/api/v1/leave-requests", {
    method: "POST",
    token: pro.token,
    body: {
      startDate: start2,
      endDate: end2,
      note: "Smoke M5 — to reject",
    },
  });
  ok(
    "POST second leave (prothesiste)",
    created.status === 201 && Boolean(created.data?.id),
    `HTTP ${created.status}`,
  );
  leaveId2 = created.data?.id;
}

if (leaveId2) {
  const reject = await api(`/api/v1/leave-requests/${leaveId2}`, {
    method: "PATCH",
    token: admin.token,
    body: { status: "rejected" },
  });
  ok(
    "PATCH reject (admin)",
    reject.status === 200 && reject.data?.status === "rejected",
    JSON.stringify(reject.data),
  );

  const cancel = await api(`/api/v1/leave-requests/${leaveId2}`, {
    method: "DELETE",
    token: pro.token,
  });
  ok(
    "DELETE rejected leave (owner)",
    cancel.status === 200 && cancel.data?.deleted === true,
    JSON.stringify(cancel.data),
  );
}

// Chef can CRUD own leaves
{
  const startChef = isoDate(50);
  const endChef = isoDate(51);
  const created = await api("/api/v1/leave-requests", {
    method: "POST",
    token: chef.token,
    body: {
      startDate: startChef,
      endDate: endChef,
      note: "Smoke M5 — chef",
    },
  });
  ok(
    "POST leave (chef)",
    created.status === 201 && Boolean(created.data?.id),
    `HTTP ${created.status}`,
  );
  const chefLeaveId = created.data?.id;
  if (chefLeaveId) {
    const list = await api("/api/v1/leave-requests", { token: chef.token });
    ok(
      "GET my leaves (chef)",
      list.status === 200 &&
        (list.data?.leave_requests ?? []).some((r) => r.id === chefLeaveId),
      `n=${list.data?.leave_requests?.length ?? "?"}`,
    );
    const del = await api(`/api/v1/leave-requests/${chefLeaveId}`, {
      method: "DELETE",
      token: chef.token,
    });
    ok(
      "DELETE pending leave (chef)",
      del.status === 200,
      `HTTP ${del.status}`,
    );
  }
}

// Trigger: insufficient balance (request more days than remaining)
{
  const hugeStart = isoDate(60);
  const hugeEnd = isoDate(60 + proBalance + 10);
  const created = await api("/api/v1/leave-requests", {
    method: "POST",
    token: pro.token,
    body: {
      startDate: hugeStart,
      endDate: hugeEnd,
      note: "Smoke M5 — should hit balance",
    },
  });
  ok(
    "POST leave insufficient balance → 409",
    created.status === 409 && created.data?.error === "balance",
    `HTTP ${created.status} ${JSON.stringify(created.data)}`,
  );
}

// Cleanup approved smoke leave via admin delete
{
  const del = await api(`/api/v1/leave-requests/${leaveId}`, {
    method: "DELETE",
    token: admin.token,
  });
  ok(
    "DELETE approved leave (admin cleanup)",
    del.status === 200,
    `HTTP ${del.status}`,
  );
}

console.log(`\nDone. exitCode=${process.exitCode ?? 0}`);
