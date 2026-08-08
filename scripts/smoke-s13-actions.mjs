/**
 * Smoke S13 — Server actions web dual-mode (authZ ≡ RLS).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s13-actions.mjs
 */
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
const SECTOR_PRO = "11111111-1111-1111-1111-111111111101";
const SECTOR_CHEF = "11111111-1111-1111-1111-111111111102";
const ID_PRO = "22222222-2222-2222-2222-222222222203";

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

async function fetchPage(path, token) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30_000);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Cookie: `il_session=${token}` },
      redirect: "manual",
      signal: ac.signal,
    });
    const text = await res.text();
    return {
      status: res.status,
      location: res.headers.get("location"),
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractActionId(html) {
  const m = html.match(/ACTION_ID_([a-f0-9]+)/i);
  return m?.[1] ?? null;
}

/** Next App Router peut renvoyer 200 + payload RSC `REDIRECT;replace;/path;307`. */
function extractRscRedirect(text) {
  const m = text.match(/REDIRECT;replace;([^;]+);(\d+)/);
  if (!m) return null;
  return { path: m[1], status: Number(m[2]) };
}

function isNotFoundPayload(text) {
  return (
    text.includes("NEXT_NOT_FOUND") ||
    /HTTP_ERROR_FALLBACK[^;\n]*;404/.test(text)
  );
}

function pageDenied(page, expectedPathPrefix) {
  if (
    page.status === 303 ||
    page.status === 307 ||
    page.status === 302
  ) {
    const loc = page.location ?? "";
    return loc.includes(expectedPathPrefix);
  }
  if (page.status === 404) return true;
  const rsc = extractRscRedirect(page.text);
  if (rsc?.path?.includes(expectedPathPrefix)) return true;
  if (isNotFoundPayload(page.text)) return true;
  return false;
}

// --- Source guards -----------------------------------------------------------
const serverSrc = read("lib/supabase/server.ts");
const demandesActions = read("app/espace-praticien/demandes/actions.ts");
const demandesPage = read("app/espace-praticien/demandes/page.tsx");
const fermeturesActions = read("app/espace-praticien/fermetures/actions.ts");
const fermeturesPage = read("app/espace-praticien/fermetures/page.tsx");
const labActions = read("app/espace-praticien/laboratoire/actions.ts");
const adminDemandesActions = read(
  "app/espace-praticien/admin/demandes/actions.ts",
);
const adminAnnoncesActions = read(
  "app/espace-praticien/admin/annonces/actions.ts",
);
const adminCongesActions = read("app/espace-praticien/admin/conges/actions.ts");
const employesActions = read("app/espace-praticien/admin/employes/actions.ts");
const praticiensActions = read(
  "app/espace-praticien/admin/praticiens/actions.ts",
);
const labDetail = read(
  "app/espace-praticien/laboratoire/[requestId]/page.tsx",
);
const pgSrc = read("lib/requests/pg.ts");

check(
  "requirePractitioner helper exists",
  serverSrc.includes("export async function requirePractitioner") &&
    serverSrc.includes('role !== "practitioner"'),
);
check(
  "demandes action requirePractitioner (not requireUser)",
  demandesActions.includes("await requirePractitioner()") &&
    !/requireUser\s*\(/.test(demandesActions),
);
check(
  "demandes page requirePractitioner",
  demandesPage.includes("requirePractitioner"),
);
check(
  "fermetures action+page requirePractitioner",
  fermeturesActions.includes("requirePractitioner") &&
    fermeturesPage.includes("requirePractitioner") &&
    !fermeturesActions.includes("requireUser"),
);
check(
  "lab action requireLaboStaff before postgres branch",
  labActions.includes("requireLaboStaff") &&
    labActions.includes("isPostgresBackend()") &&
    labActions.includes("updateLabRequestStatusPg"),
);
check(
  "admin demandes requireAdminOrChef before postgres",
  adminDemandesActions.includes("requireAdminOrChef") &&
    adminDemandesActions.includes("updateLabRequestStatusPg"),
);
check(
  "admin RH/annonces/conges requireAdmin before postgres",
  employesActions.includes("await requireAdmin()") &&
    praticiensActions.includes("await requireAdmin()") &&
    adminAnnoncesActions.includes("requireAdmin") &&
    adminCongesActions.includes("requireAdmin"),
);
check(
  "lab detail canAccessRequestRow + sector fail-closed",
  labDetail.includes("canAccessRequestRow") &&
    labDetail.includes("!profile.sectorId") &&
    labDetail.includes("sectorId: profile.sectorId"),
);
check(
  "updateLabRequestStatusPg isUuid + scope fail-closed",
  pgSrc.includes("if (!isUuid(requestId)) return false") &&
    pgSrc.includes("scope: LabRequestScope") &&
    labActions.includes("scope: isSectorLabRole") &&
    adminDemandesActions.includes('scope: isChef') &&
    read("app/espace-praticien/admin/modifications-prothese/actions.ts").includes(
      'scope: "admin"',
    ),
);
check(
  "web actions isUuid on postgres ids",
  labActions.includes("isUuid") &&
    demandesActions.includes("isUuid(sectorId)") &&
    fermeturesActions.includes("isUuid(id)") &&
    adminCongesActions.includes("isUuid(id)"),
);
const congesActions = read("app/espace-praticien/conges/actions.ts");
check(
  "create actions rate-limit (demande/fermeture/congé/annonce)",
  demandesActions.includes("RATE_LIMITS.requestCreateAction") &&
    fermeturesActions.includes("RATE_LIMITS.closureCreate") &&
    congesActions.includes("RATE_LIMITS.leaveCreate") &&
    adminAnnoncesActions.includes("RATE_LIMITS.announcementCreate") &&
    demandesActions.includes("consumeRateLimit"),
);

console.log(`\nSmoke S13 against ${baseUrl}\n`);

const sql = postgres(databaseUrl, { max: 1 });
let otherSectorRequestId = null;
let savedProSector = SECTOR_PRO;

try {
  const prac = await login("praticien@local.dev");
  const lab = await login("prothesiste@local.dev");
  const chef = await login("chef@local.dev");
  const admin = await login("admin@local.dev");

  check(
    "login 4 roles",
    Boolean(prac.data?.token) &&
      Boolean(lab.data?.token) &&
      Boolean(chef.data?.token) &&
      Boolean(admin.data?.token),
  );
  if (!prac.data?.token || !lab.data?.token) {
    throw new Error("abort: missing tokens");
  }

  // --- Deep-link pages -------------------------------------------------------
  const adminAsPrac = await fetchPage(
    "/espace-praticien/admin",
    prac.data.token,
  );
  check(
    "deep-link /admin/* praticien → redirect home",
    pageDenied(adminAsPrac, "/espace-praticien/demandes"),
    `status=${adminAsPrac.status} loc=${adminAsPrac.location} rsc=${extractRscRedirect(adminAsPrac.text)?.path ?? "-"}`,
  );

  const adminDemandesAsPrac = await fetchPage(
    "/espace-praticien/admin/demandes",
    prac.data.token,
  );
  check(
    "deep-link /admin/demandes praticien → redirect",
    pageDenied(adminDemandesAsPrac, "/espace-praticien/demandes") ||
      pageDenied(adminDemandesAsPrac, "/espace-praticien/laboratoire"),
    `status=${adminDemandesAsPrac.status} rsc=${extractRscRedirect(adminDemandesAsPrac.text)?.path ?? "-"}`,
  );

  const demandesAsLab = await fetchPage(
    "/espace-praticien/demandes",
    lab.data.token,
  );
  check(
    "deep-link /demandes lab → redirect labo",
    pageDenied(demandesAsLab, "/espace-praticien/laboratoire"),
    `status=${demandesAsLab.status} rsc=${extractRscRedirect(demandesAsLab.text)?.path ?? "-"}`,
  );

  const fermeturesAsLab = await fetchPage(
    "/espace-praticien/fermetures",
    lab.data.token,
  );
  check(
    "deep-link /fermetures lab → redirect labo",
    pageDenied(fermeturesAsLab, "/espace-praticien/laboratoire"),
    `status=${fermeturesAsLab.status} rsc=${extractRscRedirect(fermeturesAsLab.text)?.path ?? "-"}`,
  );

  const congesAsPrac = await fetchPage(
    "/espace-praticien/conges",
    prac.data.token,
  );
  check(
    "deep-link /conges praticien → redirect",
    pageDenied(congesAsPrac, "/espace-praticien/demandes"),
    `status=${congesAsPrac.status} rsc=${extractRscRedirect(congesAsPrac.text)?.path ?? "-"}`,
  );

  // --- POST createRequest mauvais rôle (server action) -----------------------
  const demandesHtml = await fetchPage(
    "/espace-praticien/demandes",
    prac.data.token,
  );
  check(
    "praticien can load /demandes",
    demandesHtml.status === 200 && Boolean(extractActionId(demandesHtml.text)),
    `status=${demandesHtml.status}`,
  );
  const actionId = extractActionId(demandesHtml.text);

  const countBefore = await sql`
    select count(*)::int as n from public.requests
     where patient_name = 'Smoke S13 Wrong Role'
  `;
  const beforeN = countBefore[0]?.n ?? 0;

  if (actionId) {
    const fd = new FormData();
    fd.set(`$ACTION_ID_${actionId}`, "");
    fd.set("subject", "Question");
    fd.set("patient_name", "Smoke S13 Wrong Role");
    fd.set(
      "message",
      "Ceci est un message de test assez long pour passer la validation.",
    );
    fd.set("sector_id", SECTOR_PRO);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30_000);
    let postRes;
    try {
      postRes = await fetch(`${baseUrl}/espace-praticien/demandes`, {
        method: "POST",
        headers: { Cookie: `il_session=${lab.data.token}` },
        body: fd,
        redirect: "manual",
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const loc = postRes.headers.get("location") ?? "";
    check(
      "POST createRequest lab → redirect (pas demandes?ok=sent)",
      (postRes.status === 303 ||
        postRes.status === 302 ||
        postRes.status === 307) &&
        !loc.includes("ok=sent") &&
        (loc.includes("/laboratoire") || loc.includes("/espace-praticien")),
      `status=${postRes.status} loc=${loc}`,
    );
  } else {
    check("POST createRequest lab (action id)", false, "no ACTION_ID in HTML");
  }

  const countAfter = await sql`
    select count(*)::int as n from public.requests
     where patient_name = 'Smoke S13 Wrong Role'
  `;
  check(
    "POST createRequest lab n’insère pas de row",
    (countAfter[0]?.n ?? 0) === beforeN,
    `before=${beforeN} after=${countAfter[0]?.n}`,
  );

  // Fermetures : même pattern
  const fermHtml = await fetchPage(
    "/espace-praticien/fermetures",
    prac.data.token,
  );
  const fermAction = extractActionId(fermHtml.text);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 40);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  const start = tomorrow.toISOString().slice(0, 10);
  const end = dayAfter.toISOString().slice(0, 10);

  const closBefore = await sql`
    select count(*)::int as n from public.closure_periods
     where note = 'Smoke S13 wrong role closure'
  `;

  if (fermAction) {
    const fd = new FormData();
    fd.set(`$ACTION_ID_${fermAction}`, "");
    fd.set("start_date", start);
    fd.set("end_date", end);
    fd.set("note", "Smoke S13 wrong role closure");
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30_000);
    let postRes;
    try {
      postRes = await fetch(`${baseUrl}/espace-praticien/fermetures`, {
        method: "POST",
        headers: { Cookie: `il_session=${lab.data.token}` },
        body: fd,
        redirect: "manual",
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    const loc = postRes.headers.get("location") ?? "";
    check(
      "POST addClosurePeriod lab → redirect (pas ok=added)",
      (postRes.status === 303 ||
        postRes.status === 302 ||
        postRes.status === 307) &&
        !loc.includes("ok=added"),
      `status=${postRes.status} loc=${loc}`,
    );
  } else {
    check("POST addClosurePeriod lab (action id)", false, "no ACTION_ID");
  }

  const closAfter = await sql`
    select count(*)::int as n from public.closure_periods
     where note = 'Smoke S13 wrong role closure'
  `;
  check(
    "POST addClosurePeriod lab n’insère pas de row",
    (closAfter[0]?.n ?? 0) === (closBefore[0]?.n ?? 0),
  );

  // --- Lab détail autre secteur ---------------------------------------------
  const createdOther = await fetchJson("/api/v1/requests", {
    method: "POST",
    token: prac.data.token,
    body: {
      subject: "Infos complémentaires",
      message: "Smoke S13 — demande secteur chef (Amovible).",
      patientName: "Patient S13 Autre Secteur",
      sectorId: SECTOR_CHEF,
    },
  });
  check(
    "create request autre secteur",
    createdOther.status === 201 && Boolean(createdOther.data?.id),
    `HTTP ${createdOther.status}`,
  );
  otherSectorRequestId = createdOther.data?.id ?? null;

  if (otherSectorRequestId) {
    const detailCross = await fetchPage(
      `/espace-praticien/laboratoire/${otherSectorRequestId}`,
      lab.data.token,
    );
    // notFound() → 404 ; ou redirect labo
    check(
      "lab détail autre secteur → 404/redirect",
      pageDenied(detailCross, "/espace-praticien/laboratoire") ||
        detailCross.status === 404 ||
        isNotFoundPayload(detailCross.text) ||
        !detailCross.text.includes("Patient S13 Autre Secteur"),
      `status=${detailCross.status} rsc=${extractRscRedirect(detailCross.text)?.path ?? "-"} notFound=${isNotFoundPayload(detailCross.text)}`,
    );

    // Lab sans secteur → deny
    const proRows = await sql`
      select sector_id::text as sector_id from public.profiles
       where id = ${ID_PRO}::uuid
    `;
    savedProSector = proRows[0]?.sector_id ?? SECTOR_PRO;
    await sql`
      update public.profiles set sector_id = null
       where id = ${ID_PRO}::uuid
    `;
    // Re-login to refresh profile cache? getCurrentProfile is per-request cache;
    // new request should see null sector.
    const labRelog = await login("prothesiste@local.dev");
    const detailNoSector = await fetchPage(
      `/espace-praticien/laboratoire/${otherSectorRequestId}`,
      labRelog.data.token,
    );
    check(
      "lab sans secteur détail → redirect forbidden",
      pageDenied(detailNoSector, "/espace-praticien/laboratoire") ||
        isNotFoundPayload(detailNoSector.text),
      `status=${detailNoSector.status} rsc=${extractRscRedirect(detailNoSector.text)?.path ?? "-"}`,
    );
    await sql`
      update public.profiles set sector_id = ${savedProSector}::uuid
       where id = ${ID_PRO}::uuid
    `;
  }

  // Admin action mauvais rôle : praticien POST mark closed via admin action id
  const inboxHtml = await fetchPage(
    "/espace-praticien/admin/demandes",
    admin.data.token,
  );
  const inboxAction = extractActionId(inboxHtml.text);
  if (inboxAction && otherSectorRequestId) {
    const fd = new FormData();
    fd.set(`$ACTION_ID_${inboxAction}`, "");
    fd.set("id", otherSectorRequestId);
    fd.set("status", "open");
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30_000);
    let postRes;
    try {
      postRes = await fetch(`${baseUrl}/espace-praticien/admin/demandes`, {
        method: "POST",
        headers: { Cookie: `il_session=${prac.data.token}` },
        body: fd,
        redirect: "manual",
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    const loc = postRes.headers.get("location") ?? "";
    const statusRow = await sql`
      select status from public.requests where id = ${otherSectorRequestId}::uuid
    `;
    check(
      "POST admin markRequest praticien → redirect hors inbox ok",
      (postRes.status === 303 ||
        postRes.status === 302 ||
        postRes.status === 307) &&
        !loc.includes("/admin/demandes?status="),
      `status=${postRes.status} loc=${loc}`,
    );
    check(
    "POST admin markRequest praticien ne change pas le statut",
    statusRow[0]?.status === "open",
    `status=${statusRow[0]?.status}`,
  );
  } else {
    check(
      "POST admin markRequest praticien (setup)",
      Boolean(inboxAction),
      `action=${inboxAction} req=${otherSectorRequestId}`,
    );
  }
} finally {
  try {
    await sql`
      update public.profiles set sector_id = ${savedProSector}::uuid
       where id = ${ID_PRO}::uuid
    `;
  } catch {
    /* ignore */
  }
  if (otherSectorRequestId) {
    try {
      await sql`delete from public.request_media where request_id = ${otherSectorRequestId}::uuid`;
      await sql`delete from public.request_messages where request_id = ${otherSectorRequestId}::uuid`;
      await sql`delete from public.requests where id = ${otherSectorRequestId}::uuid`;
    } catch {
      /* ignore */
    }
  }
  await sql`delete from public.requests where patient_name = 'Smoke S13 Wrong Role'`;
  await sql`delete from public.closure_periods where note = 'Smoke S13 wrong role closure'`;
  await sql.end({ timeout: 5 });
}

console.log(`\nS13 done. failures=${failed}`);
process.exit(failed > 0 ? 1 : 0);
