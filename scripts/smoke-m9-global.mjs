/**
 * Smoke M9 — dashboard admin dual-mode + parcours critiques postgres.
 * Prérequis: DATA_BACKEND=postgres, Docker up, seed, `npm run dev`.
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const PASS = "ImplantolabDev1!";
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://implantolab:implantolab@localhost:5432/implantolab";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

function isoDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

console.log(`Smoke M9 global against ${BASE}\n`);

// --- Static: dashboard page dual-mode, no Supabase on postgres path ---
{
  const pagePath = join(ROOT, "app/espace-praticien/admin/page.tsx");
  const src = await readFile(pagePath, "utf8");
  ok(
    "admin page dual-mode (isPostgresBackend)",
    src.includes("isPostgresBackend()"),
  );
  ok(
    "admin page uses getAdminDashboardStatsPg",
    src.includes("getAdminDashboardStatsPg"),
  );
  const postgresBranch = src.match(
    /if \(isPostgresBackend\(\)\) \{([\s\S]*?)\} else \{/,
  );
  const pgBody = postgresBranch?.[1] ?? "";
  ok(
    "postgres branch has no getServerSupabase()",
    !pgBody.includes("getServerSupabase()"),
  );
  ok(
    "supabase branch kept for prod",
    src.includes("} else {") && src.includes("getServerSupabase()"),
  );
}

const roles = [
  { email: "admin@local.dev", role: "admin" },
  { email: "praticien@local.dev", role: "practitioner" },
  { email: "prothesiste@local.dev", role: "prosthetist" },
  { email: "chef@local.dev", role: "chef_de_secteur" },
];

const sessions = {};
for (const { email, role } of roles) {
  const data = await login(email);
  if (!data?.token) {
    process.exit(1);
  }
  sessions[role] = data;
  const me = await api("/api/v1/me", { token: data.token });
  ok(
    `GET /me ${role}`,
    me.status === 200 && me.data?.profile?.role === role,
    me.data?.profile?.role ?? `HTTP ${me.status}`,
  );
}

const admin = sessions.admin;
const prac = sessions.practitioner;
const pro = sessions.prosthetist;
const chef = sessions.chef_de_secteur;

// --- Dashboard API ---
{
  const forbidden = await api("/api/v1/admin/dashboard", {
    token: prac.token,
  });
  ok(
    "GET /admin/dashboard forbidden (praticien)",
    forbidden.status === 403,
    `HTTP ${forbidden.status}`,
  );
}

let dash = null;
{
  const r = await api("/api/v1/admin/dashboard", { token: admin.token });
  ok(
    "GET /admin/dashboard (admin)",
    r.status === 200 &&
      typeof r.data?.closuresThisWeek === "number" &&
      typeof r.data?.openRequests === "number" &&
      typeof r.data?.practitionersCount === "number",
    `HTTP ${r.status} ${JSON.stringify(r.data)}`,
  );
  dash = r.data;
}

// --- KPI cohérents avec SQL seed ---
{
  const postgres = await import("postgres");
  const sql = postgres.default(DATABASE_URL, { max: 1 });
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSeven = new Date(today);
    inSeven.setDate(inSeven.getDate() + 7);
    const todayIso = isoDateLocal(today);
    const inSevenIso = isoDateLocal(inSeven);

    const [closures] = await sql`
      select count(*)::int as count
        from public.closure_periods
       where start_date <= ${inSevenIso}::date
         and end_date >= ${todayIso}::date
    `;
    const [openInbox] = await sql`
      select count(*)::int as count
        from public.requests
       where status = 'open'
         and subject = any(${["Question", "Urgence"]}::text[])
    `;
    const [practitioners] = await sql`
      select count(*)::int as count
        from public.profiles
       where role = 'practitioner'
         and deleted_at is null
    `;

    ok(
      "seed: ≥1 praticien actif",
      (practitioners?.count ?? 0) >= 1,
      `n=${practitioners?.count}`,
    );
    ok(
      "dashboard.practitionersCount == SQL",
      dash?.practitionersCount === practitioners.count,
      `api=${dash?.practitionersCount} sql=${practitioners.count}`,
    );
    ok(
      "dashboard.openRequests == SQL",
      dash?.openRequests === openInbox.count,
      `api=${dash?.openRequests} sql=${openInbox.count}`,
    );
    ok(
      "dashboard.closuresThisWeek == SQL",
      dash?.closuresThisWeek === closures.count,
      `api=${dash?.closuresThisWeek} sql=${closures.count}`,
    );
    ok(
      "dashboard.recentRequests is array",
      Array.isArray(dash?.recentRequests),
      `n=${dash?.recentRequests?.length ?? "?"}`,
    );
    ok(
      "dashboard.upcomingClosures is array",
      Array.isArray(dash?.upcomingClosures),
      `n=${dash?.upcomingClosures?.length ?? "?"}`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// --- Parcours critiques par rôle ---
{
  const sectors = await api("/api/v1/sectors", { token: admin.token });
  ok(
    "GET /sectors (admin)",
    sectors.status === 200 && (sectors.data?.sectors?.length ?? 0) >= 3,
    `n=${sectors.data?.sectors?.length ?? "?"}`,
  );
}

{
  const r = await api("/api/v1/requests?limit=20", { token: prac.token });
  ok(
    "GET /requests (praticien)",
    r.status === 200 && Array.isArray(r.data?.requests),
    `n=${r.data?.requests?.length ?? "?"}`,
  );
}

{
  const lab = encodeURIComponent("Infos complémentaires");
  const r = await api(`/api/v1/requests?subjects=${lab}&limit=20`, {
    token: pro.token,
  });
  ok(
    "GET /requests lab (prothésiste)",
    r.status === 200 && Array.isArray(r.data?.requests),
    `n=${r.data?.requests?.length ?? "?"}`,
  );
}

{
  const inbox = encodeURIComponent("Question,Urgence");
  const r = await api(`/api/v1/requests?subjects=${inbox}&limit=20`, {
    token: chef.token,
  });
  ok(
    "GET /requests Q/Urgence (chef)",
    r.status === 200 && Array.isArray(r.data?.requests),
    `n=${r.data?.requests?.length ?? "?"}`,
  );
}

{
  const r = await api("/api/v1/leave-requests", { token: pro.token });
  ok(
    "GET /leave-requests (prothésiste)",
    r.status === 200 && Array.isArray(r.data?.leave_requests),
    `HTTP ${r.status}`,
  );
}

{
  const r = await api("/api/v1/closure-periods", { token: prac.token });
  ok(
    "GET /closure-periods (praticien)",
    r.status === 200 && Array.isArray(r.data?.closure_periods),
    `HTTP ${r.status}`,
  );
}

{
  const r = await api("/api/v1/announcements", { token: prac.token });
  ok(
    "GET /announcements (praticien)",
    r.status === 200 && Array.isArray(r.data?.announcements),
    `n=${r.data?.announcements?.length ?? "?"}`,
  );
}

{
  const r = await api("/api/v1/rh/sectors", { token: admin.token });
  ok(
    "GET /rh/sectors (admin)",
    r.status === 200 && Array.isArray(r.data?.sectors),
    `n=${r.data?.sectors?.length ?? "?"}`,
  );
}

{
  const r = await api("/api/v1/rh/users", { token: admin.token });
  ok(
    "GET /rh/users (admin)",
    r.status === 200 && Array.isArray(r.data?.users),
    `n=${r.data?.users?.length ?? "?"}`,
  );
}

// --- Logout smoke ---
{
  const out = await api("/api/v1/auth/logout", {
    method: "POST",
    token: admin.token,
  });
  ok(
    "logout admin",
    out.status === 200 || out.status === 204,
    `HTTP ${out.status}`,
  );
  const me = await api("/api/v1/me", { token: admin.token });
  ok("me after logout is 401", me.status === 401, `HTTP ${me.status}`);
}

console.log(`\nDone. exitCode=${process.exitCode ?? 0}`);
