/**
 * Smoke S12 — Congés / fermetures / annonces / dashboard / sectors (authZ).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s12-secondary.mjs
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
const ID_PRO = "22222222-2222-2222-2222-222222222203";
const ID_CHEF = "22222222-2222-2222-2222-222222222204";
const ID_PRAC = "22222222-2222-2222-2222-222222222202";
const stamp = Date.now();

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
    return { status: res.status, data };
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

// --- Source guards -----------------------------------------------------------
const leaveIdRoute = read("app/api/v1/leave-requests/[id]/route.ts");
const leaveRoute = read("app/api/v1/leave-requests/route.ts");
const closureIdRoute = read("app/api/v1/closure-periods/[id]/route.ts");
const closureRoute = read("app/api/v1/closure-periods/route.ts");
const annRoute = read("app/api/v1/announcements/route.ts");
const annIdRoute = read("app/api/v1/announcements/[id]/route.ts");
const dashRoute = read("app/api/v1/admin/dashboard/route.ts");
const sectorsRoute = read("app/api/v1/sectors/route.ts");
const leavePg = read("lib/leave/pg.ts");
const closurePg = read("lib/closures/pg.ts");
const annPg = read("lib/announcements/pg.ts");

check(
  "leave review admin-only",
  leaveIdRoute.includes('profile.role !== "admin"') &&
    leaveIdRoute.includes("reviewLeaveRequestPg"),
);
check(
  "leave delete own scoped by profile_id",
  leavePg.includes("and profile_id = ${params.profileId}::uuid") &&
    leaveIdRoute.includes("deleteOwnLeaveRequestPg"),
);
check(
  "closure delete own scoped by profile_id",
  closurePg.includes("and profile_id = ${params.profileId}::uuid") &&
    closureIdRoute.includes("deleteOwnClosurePeriodPg"),
);
check(
  "helpers leave/closures/announcements documentent caller-scoper",
  leavePg.includes("sans authZ intrinsèque") &&
    closurePg.includes("sans authZ intrinsèque") &&
    annPg.includes("sans authZ intrinsèque") &&
    leavePg.includes("isUuid") &&
    closurePg.includes("isUuid") &&
    annPg.includes("isUuid"),
);
check(
  "dashboard admin-only",
  dashRoute.includes('profile.role !== "admin"'),
);
check(
  "announcements CRUD role gates",
  annRoute.includes('profile.role !== "admin"') &&
    annRoute.includes('profile.role !== "practitioner"') &&
    annIdRoute.includes('profile.role !== "admin"'),
);
check(
  "isUuid on leave/closure/announcement ids",
  leaveIdRoute.includes("isUuid") &&
    closureIdRoute.includes("isUuid") &&
    annIdRoute.includes("isUuid"),
);
check(
  "sectors requires profile",
  sectorsRoute.includes("loadProfile") &&
    sectorsRoute.includes("profile_missing"),
);
check(
  "leave POST lab-only / GET admin|lab",
  leaveRoute.includes("isSectorLabRole") &&
    leaveRoute.includes('profile.role === "admin"'),
);
check(
  "closure POST practitioner-only",
  closureRoute.includes('profile.role !== "practitioner"'),
);
check(
  "closure DELETE practitioner|admin (P2-7 S12)",
  closureIdRoute.includes("deleteClosurePeriodAsAdminPg") &&
    closureIdRoute.includes('profile.role !== "practitioner"') &&
    closureIdRoute.includes('profile.role !== "admin"') &&
    closurePg.includes("deleteClosurePeriodAsAdminPg"),
);
check(
  "POST leave/closure/announcements rate-limit process-local",
  leaveRoute.includes("consumeRateLimit") &&
    leaveRoute.includes("RATE_LIMITS.leaveCreate") &&
    closureRoute.includes("RATE_LIMITS.closureCreate") &&
    annRoute.includes("RATE_LIMITS.announcementCreate") &&
    leaveRoute.includes("rateLimitedJson"),
);

// --- Runtime -----------------------------------------------------------------
const sql = postgres(databaseUrl, { max: 1 });
const noteLeave = `s12-smoke-${stamp}`;
const noteLeaveChef = `s12-chef-${stamp}`;
const noteClos = `s12-clos-${stamp}`;
const annTitle = `s12-ann-${stamp}`;

try {
  const tokens = {};
  for (const [label, email] of [
    ["admin", "admin@local.dev"],
    ["praticien", "praticien@local.dev"],
    ["prothesiste", "prothesiste@local.dev"],
    ["chef", "chef@local.dev"],
  ]) {
    const r = await login(email);
    check(`login ${label}`, r.status === 200 && Boolean(r.data?.token), `status=${r.status}`);
    tokens[label] = r.data?.token;
  }
  if (!tokens.admin || !tokens.prothesiste || !tokens.chef || !tokens.praticien) {
    throw new Error("abort: missing tokens");
  }

  // Dashboard
  {
    const ok = await fetchJson("/api/v1/admin/dashboard", { token: tokens.admin });
    check("dashboard admin 200", ok.status === 200 && typeof ok.data?.openRequests === "number");
    for (const role of ["chef", "praticien", "prothesiste"]) {
      const r = await fetchJson("/api/v1/admin/dashboard", { token: tokens[role] });
      check(`dashboard ${role} 403`, r.status === 403 && r.data?.error === "forbidden");
    }
    const unauth = await fetchJson("/api/v1/admin/dashboard");
    check("dashboard unauth 401", unauth.status === 401);
  }

  // Sectors
  {
    const unauth = await fetchJson("/api/v1/sectors");
    check("sectors unauth 401", unauth.status === 401);
    const prac = await fetchJson("/api/v1/sectors", { token: tokens.praticien });
    check(
      "sectors authenticated 200",
      prac.status === 200 && Array.isArray(prac.data?.sectors) && prac.data.sectors.length >= 1,
    );
  }

  // Leave create + IDOR delete + review
  const leavePro = await fetchJson("/api/v1/leave-requests", {
    method: "POST",
    token: tokens.prothesiste,
    body: {
      startDate: "2032-06-01",
      endDate: "2032-06-02",
      note: noteLeave,
    },
  });
  check("leave create pro 201", leavePro.status === 201 && Boolean(leavePro.data?.id));
  const leaveId = leavePro.data?.id;

  const leaveChef = await fetchJson("/api/v1/leave-requests", {
    method: "POST",
    token: tokens.chef,
    body: {
      startDate: "2032-07-01",
      endDate: "2032-07-01",
      note: noteLeaveChef,
    },
  });
  check("leave create chef 201", leaveChef.status === 201 && Boolean(leaveChef.data?.id));

  if (leaveId) {
    const cross = await fetchJson(`/api/v1/leave-requests/${leaveId}`, {
      method: "DELETE",
      token: tokens.chef,
    });
    check(
      "DELETE leave cross-user fail",
      cross.status === 404 && cross.data?.error === "not_found",
      `status=${cross.status}`,
    );
    const still = await sql`
      select id::text from public.leave_requests where id = ${leaveId}::uuid
    `;
    check("leave still owned after cross DELETE", still.length === 1);

    for (const role of ["chef", "praticien", "prothesiste"]) {
      const r = await fetchJson(`/api/v1/leave-requests/${leaveId}`, {
        method: "PATCH",
        token: tokens[role],
        body: { status: "approved" },
      });
      check(`approve leave ${role} 403`, r.status === 403);
    }

    const badUuid = await fetchJson("/api/v1/leave-requests/not-a-uuid", {
      method: "DELETE",
      token: tokens.prothesiste,
    });
    check("leave DELETE invalid uuid 400", badUuid.status === 400);

    const badPatch = await fetchJson("/api/v1/leave-requests/not-a-uuid", {
      method: "PATCH",
      token: tokens.admin,
      body: { status: "approved" },
    });
    check("leave PATCH invalid uuid 400", badPatch.status === 400);

    const missing = await fetchJson(`/api/v1/leave-requests/${randomUUID()}`, {
      method: "DELETE",
      token: tokens.prothesiste,
    });
    check("leave DELETE unknown uuid 404", missing.status === 404);
  }

  // Leave list scopes
  {
    const listPro = await fetchJson("/api/v1/leave-requests", {
      token: tokens.prothesiste,
    });
    const rows = listPro.data?.leave_requests ?? [];
    check(
      "leave list pro own-only",
      listPro.status === 200 && rows.every((r) => r.profile_id === ID_PRO),
      `n=${rows.length}`,
    );
    const listPrac = await fetchJson("/api/v1/leave-requests", {
      token: tokens.praticien,
    });
    check("leave list praticien 403", listPrac.status === 403);
    const listAdmin = await fetchJson("/api/v1/leave-requests", {
      token: tokens.admin,
    });
    check(
      "leave list admin all",
      listAdmin.status === 200 &&
        (listAdmin.data?.leave_requests ?? []).some((r) => r.profile_id === ID_CHEF),
    );
  }

  // Admin approve then cleanup via admin delete
  if (leaveId) {
    const approved = await fetchJson(`/api/v1/leave-requests/${leaveId}`, {
      method: "PATCH",
      token: tokens.admin,
      body: { status: "approved" },
    });
    check("admin approve leave 200", approved.status === 200);

    const ownerDelApproved = await fetchJson(`/api/v1/leave-requests/${leaveId}`, {
      method: "DELETE",
      token: tokens.prothesiste,
    });
    check(
      "owner cannot DELETE approved leave",
      ownerDelApproved.status === 404,
      `status=${ownerDelApproved.status}`,
    );
  }

  // Closures IDOR
  const clos = await fetchJson("/api/v1/closure-periods", {
    method: "POST",
    token: tokens.praticien,
    body: {
      startDate: "2032-08-01",
      endDate: "2032-08-02",
      note: noteClos,
    },
  });
  check("closure create prac 201", clos.status === 201 && Boolean(clos.data?.id));
  let closId = clos.data?.id;

  if (closId) {
    for (const role of ["chef", "prothesiste"]) {
      const r = await fetchJson(`/api/v1/closure-periods/${closId}`, {
        method: "DELETE",
        token: tokens[role],
      });
      check(`closure DELETE ${role} forbidden/fail`, r.status === 403);
    }
    const still = await sql`
      select id::text from public.closure_periods where id = ${closId}::uuid
    `;
    check("closure still exists after lab DELETE", still.length === 1);

    // P2-7 / S12 : admin DELETE any (parité RLS).
    const adminDel = await fetchJson(`/api/v1/closure-periods/${closId}`, {
      method: "DELETE",
      token: tokens.admin,
    });
    check(
      "closure DELETE admin → 200",
      adminDel.status === 200 && adminDel.data?.deleted === true,
      `status=${adminDel.status}`,
    );
    const gone = await sql`
      select id::text from public.closure_periods where id = ${closId}::uuid
    `;
    check("closure deleted by admin", gone.length === 0);

    // Recreate for praticien own-delete + IDOR checks below
    const [recreated] = await sql`
      insert into public.closure_periods (
        profile_id, start_date, end_date, note, created_by
      )
      values (
        ${ID_PRAC}::uuid,
        '2032-08-01'::date,
        '2032-08-03'::date,
        ${`s12-clos-${stamp}-b`},
        ${ID_PRAC}::uuid
      )
      returning id::text
    `;
    closId = recreated.id;

    // Foreign owner row (chef) — praticien must not delete
    const [foreign] = await sql`
      insert into public.closure_periods (
        profile_id, start_date, end_date, note, created_by
      )
      values (
        ${ID_CHEF}::uuid,
        '2032-09-01'::date,
        '2032-09-02'::date,
        ${`s12-foreign-${stamp}`},
        ${ID_CHEF}::uuid
      )
      returning id::text
    `;
    const idor = await fetchJson(`/api/v1/closure-periods/${foreign.id}`, {
      method: "DELETE",
      token: tokens.praticien,
    });
    check(
      "DELETE closure cross-user fail",
      idor.status === 404 && idor.data?.error === "not_found",
      `status=${idor.status}`,
    );
    const foreignStill = await sql`
      select id::text from public.closure_periods where id = ${foreign.id}::uuid
    `;
    check("foreign closure intact", foreignStill.length === 1);

    // Admin can delete foreign closure (parité RLS)
    const adminForeign = await fetchJson(
      `/api/v1/closure-periods/${foreign.id}`,
      { method: "DELETE", token: tokens.admin },
    );
    check(
      "admin DELETE foreign closure → 200",
      adminForeign.status === 200 && adminForeign.data?.deleted === true,
      `status=${adminForeign.status}`,
    );

    const badUuid = await fetchJson("/api/v1/closure-periods/not-a-uuid", {
      method: "DELETE",
      token: tokens.praticien,
    });
    check("closure DELETE invalid uuid 400", badUuid.status === 400);
  }

  // Announcements role matrix
  {
    for (const role of ["prothesiste", "chef"]) {
      const r = await fetchJson("/api/v1/announcements", { token: tokens[role] });
      check(`announcements GET ${role} 403`, r.status === 403);
    }
    const getPrac = await fetchJson("/api/v1/announcements", {
      token: tokens.praticien,
    });
    check("announcements GET praticien 200", getPrac.status === 200);

    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    for (const role of ["praticien", "chef", "prothesiste"]) {
      const r = await fetchJson("/api/v1/announcements", {
        method: "POST",
        token: tokens[role],
        body: { title: annTitle, body: "nope", expiresAt },
      });
      check(`announcements POST ${role} 403`, r.status === 403);
    }
    const created = await fetchJson("/api/v1/announcements", {
      method: "POST",
      token: tokens.admin,
      body: { title: annTitle, body: "s12 body", expiresAt },
    });
    check("announcements POST admin 201", created.status === 201 && Boolean(created.data?.id));
    const annId = created.data?.id;
    if (annId) {
      for (const role of ["praticien", "chef", "prothesiste"]) {
        const r = await fetchJson(`/api/v1/announcements/${annId}`, {
          method: "DELETE",
          token: tokens[role],
        });
        check(`announcements DELETE ${role} 403`, r.status === 403);
      }
      const badUuid = await fetchJson("/api/v1/announcements/not-a-uuid", {
        method: "DELETE",
        token: tokens.admin,
      });
      check("announcements DELETE invalid uuid 400", badUuid.status === 400);

      const del = await fetchJson(`/api/v1/announcements/${annId}`, {
        method: "DELETE",
        token: tokens.admin,
      });
      check("announcements DELETE admin 200", del.status === 200 && del.data?.deleted === true);
    }
  }

  // Leave POST forbidden for praticien/admin
  {
    const pracPost = await fetchJson("/api/v1/leave-requests", {
      method: "POST",
      token: tokens.praticien,
      body: { startDate: "2032-10-01", endDate: "2032-10-01" },
    });
    check("leave POST praticien 403", pracPost.status === 403);
    const adminPost = await fetchJson("/api/v1/leave-requests", {
      method: "POST",
      token: tokens.admin,
      body: { startDate: "2032-10-01", endDate: "2032-10-01" },
    });
    check("leave POST admin 403", adminPost.status === 403);
  }
} finally {
  await sql`
    delete from public.leave_requests
     where note like ${`s12-%${stamp}%`}
  `;
  await sql`
    delete from public.closure_periods
     where note like ${`s12-%${stamp}%`}
  `;
  await sql`
    delete from public.admin_announcements
     where title like ${`s12-%${stamp}%`}
  `;
  await sql.end();
}

if (failed > 0) {
  console.error(`\nS12 smoke FAILED (${failed})`);
  process.exit(1);
}
console.log("\nS12 smoke OK — all good");
