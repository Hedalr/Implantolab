/**
 * Smoke S5 — guards authZ (remplace RLS).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s5-access.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import bcrypt from "bcryptjs";

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
const PRO_ID = "22222222-2222-2222-2222-222222222203";

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
  const r = await fetchJson("/api/v1/auth/login", {
    method: "POST",
    body: { email, password: PASS },
  });
  return r;
}

// --- Source guards -----------------------------------------------------------
const accessSrc = read("lib/api/v1/access.ts");
const pgSrc = read("lib/requests/pg.ts");
const labPageSrc = read("app/espace-praticien/laboratoire/page.tsx");
const labDetailSrc = read(
  "app/espace-praticien/laboratoire/[requestId]/page.tsx",
);
const inboxSrc = read("app/espace-praticien/admin/demandes/page.tsx");
const patchSrc = read("app/api/v1/requests/[id]/route.ts");

check(
  "canAccessRequestRow fail-closed lab sans secteur",
  accessSrc.includes("canAccessRequestRow") &&
    accessSrc.includes("isSectorLabRole(profile.role)") &&
    accessSrc.includes("profile.sectorId") &&
    accessSrc.includes("request.sectorId"),
);
check(
  "canAccessRequest requires lab sectorId",
  /isLab = isSectorLabRole\(profile\.role\) && Boolean\(profile\.sectorId\)/.test(
    accessSrc,
  ),
);
check(
  "P2-7 S5 allowedSubjectsForRole enforced in access + list + PATCH",
  accessSrc.includes("allowedSubjectsForRole") &&
    pgSrc.includes("resolveApiListSubjects") &&
    pgSrc.includes("allowedSubjectsForRole") &&
    patchSrc.includes("subjects: labSubjects") &&
    read("lib/requests/types.ts").includes("allowedSubjectsForRole"),
);
check(
  "listRequestsForApi lab sans sector → false",
  /isSectorLabRole\(role\)[\s\S]*sectorId[\s\S]*sql`false`/.test(pgSrc),
);
check(
  "getLabRequestByIdPg opts.sectorId deny null",
  pgSrc.includes('opts && "sectorId" in opts && !sectorId'),
);
check(
  "listLabRequestsPg / updateLabRequestStatusPg typed scope fail-closed",
  pgSrc.includes('export type LabRequestScope = "admin" | { sectorId: string }') &&
    pgSrc.includes("scope: LabRequestScope") &&
    pgSrc.includes("resolveLabSectorFilter") &&
    !/updateLabRequestStatusPg\(opts: \{[\s\S]*?sectorId\?:/.test(pgSrc),
);
check(
  "lab list/update callers pass scope (pas SQL ouvert)",
  labPageSrc.includes('scope: isAdmin') &&
    labPageSrc.includes("sectorId: profile.sectorId") &&
    read("app/espace-praticien/laboratoire/actions.ts").includes(
      "scope: isSectorLabRole",
    ) &&
    read("app/api/v1/requests/[id]/route.ts").includes(
      "scope: isSectorLabRole",
    ) &&
    read("lib/admin/dashboard-pg.ts").includes('scope: "admin"'),
);
check(
  "lab list page labDenied",
  labPageSrc.includes("labDenied") && labPageSrc.includes("!profile.sectorId"),
);
check(
  "lab detail uses canAccessRequestRow + sector scope",
  labDetailSrc.includes("canAccessRequestRow") &&
    labDetailSrc.includes("sectorId: profile.sectorId"),
);
check(
  "chef inbox chefDenied",
  inboxSrc.includes("chefDenied") &&
    inboxSrc.includes("isChef && !profile.sectorId"),
);
check(
  "PATCH API denies lab sans sector",
  patchSrc.includes("isSectorLabRole(profile.role) && !profile.sectorId") &&
    patchSrc.includes('error: "forbidden"'),
);

console.log(`\nSmoke S5 against ${baseUrl}\n`);

const sql = postgres(databaseUrl, { max: 1 });
const stamp = Date.now();
const pracBId = randomUUID();
const pracBEmail = `smoke-s5-prac-${stamp}@local.dev`;
let requestA = null;
let requestB = null;
let requestOtherSector = null;
let savedProSector = SECTOR_PRO;

try {
  // --- Setup: praticien B + demandes ------------------------------------------
  const hash = await bcrypt.hash(PASS, 10);
  await sql`
    insert into public.users (id, email, password_hash, email_confirmed_at)
    values (${pracBId}::uuid, ${pracBEmail}, ${hash}, now())
  `;
  await sql`
    update public.profiles
       set role = 'practitioner',
           full_name = 'Smoke S5 Praticien B',
           sector_id = null,
           deleted_at = null
     where id = ${pracBId}::uuid
  `;

  const pracA = await login("praticien@local.dev");
  check(
    "login praticien A",
    pracA.status === 200 && Boolean(pracA.data?.token),
    `HTTP ${pracA.status}`,
  );
  if (!pracA.data?.token) throw new Error("abort: no prac A token");

  const createdA = await fetchJson("/api/v1/requests", {
    method: "POST",
    token: pracA.data.token,
    body: {
      subject: "Infos complémentaires",
      message: "Smoke S5 — demande praticien A secteur pro.",
      patientName: "Patient S5 A",
      sectorId: SECTOR_PRO,
    },
  });
  check(
    "create request A (praticien A)",
    createdA.status === 201 && Boolean(createdA.data?.id),
    `HTTP ${createdA.status}`,
  );
  requestA = createdA.data?.id;

  const createdOther = await fetchJson("/api/v1/requests", {
    method: "POST",
    token: pracA.data.token,
    body: {
      subject: "Infos complémentaires",
      message: "Smoke S5 — demande praticien A secteur chef.",
      patientName: "Patient S5 other",
      sectorId: SECTOR_CHEF,
    },
  });
  check(
    "create request other sector",
    createdOther.status === 201 && Boolean(createdOther.data?.id),
    `HTTP ${createdOther.status}`,
  );
  requestOtherSector = createdOther.data?.id;

  const pracB = await login(pracBEmail);
  check(
    "login praticien B",
    pracB.status === 200 && Boolean(pracB.data?.token),
    `HTTP ${pracB.status}`,
  );
  if (!pracB.data?.token) throw new Error("abort: no prac B token");

  const createdB = await fetchJson("/api/v1/requests", {
    method: "POST",
    token: pracB.data.token,
    body: {
      subject: "Question",
      message: "Smoke S5 — demande praticien B (IDOR target).",
      patientName: "Patient S5 B",
      sectorId: SECTOR_PRO,
    },
  });
  check(
    "create request B (praticien B)",
    createdB.status === 201 && Boolean(createdB.data?.id),
    `HTTP ${createdB.status}`,
  );
  requestB = createdB.data?.id;

  // --- praticien A ≠ requête B ----------------------------------------------
  const idor = await fetchJson(`/api/v1/requests/${requestB}`, {
    token: pracA.data.token,
  });
  check(
    "praticien A ≠ requête B → 403",
    idor.status === 403,
    `HTTP ${idor.status}`,
  );

  const own = await fetchJson(`/api/v1/requests/${requestA}`, {
    token: pracA.data.token,
  });
  check(
    "praticien A → propre requête OK",
    own.status === 200,
    `HTTP ${own.status}`,
  );

  // --- lab limité à son secteur ---------------------------------------------
  const pro = await login("prothesiste@local.dev");
  check(
    "login prothésiste",
    pro.status === 200 && Boolean(pro.data?.token),
    `HTTP ${pro.status}`,
  );
  if (!pro.data?.token) throw new Error("abort: no pro token");

  const proList = await fetchJson(
    `/api/v1/requests?subjects=${encodeURIComponent("Infos complémentaires")}&limit=200`,
    { token: pro.data.token },
  );
  const proRows = proList.data?.requests ?? [];
  const proScoped = proRows.every((r) => r.sector_id === SECTOR_PRO);
  check(
    "lab list scoped to sector",
    proList.status === 200 && proScoped,
    `n=${proRows.length} scoped=${proScoped}`,
  );

  const proOwn = await fetchJson(`/api/v1/requests/${requestA}`, {
    token: pro.data.token,
  });
  check(
    "lab GET same sector OK",
    proOwn.status === 200,
    `HTTP ${proOwn.status}`,
  );

  // P2-7 / S5 : prothésiste ne voit pas Question/Urgence (API enforce).
  const proQuestion = await fetchJson(`/api/v1/requests/${requestB}`, {
    token: pro.data.token,
  });
  check(
    "prothésiste GET Question même secteur → 403",
    proQuestion.status === 403,
    `HTTP ${proQuestion.status}`,
  );

  const proListQ = await fetchJson(
    `/api/v1/requests?subjects=${encodeURIComponent("Question")}&limit=200`,
    { token: pro.data.token },
  );
  check(
    "prothésiste list subjects=Question → vide",
    proListQ.status === 200 &&
      Array.isArray(proListQ.data?.requests) &&
      proListQ.data.requests.length === 0,
    `n=${proListQ.data?.requests?.length ?? "?"}`,
  );

  const chef = await login("chef@local.dev");
  check(
    "login chef",
    chef.status === 200 && Boolean(chef.data?.token),
    `HTTP ${chef.status}`,
  );
  if (chef.data?.token) {
    const createdChefQ = await fetchJson("/api/v1/requests", {
      method: "POST",
      token: pracA.data.token,
      body: {
        subject: "Question",
        message: "Smoke S5 — Question secteur chef.",
        patientName: "Patient S5 ChefQ",
        sectorId: SECTOR_CHEF,
      },
    });
    check(
      "create Question secteur chef",
      createdChefQ.status === 201 && Boolean(createdChefQ.data?.id),
      `HTTP ${createdChefQ.status}`,
    );
    const chefQId = createdChefQ.data?.id;
    if (chefQId) {
      const chefGetQ = await fetchJson(`/api/v1/requests/${chefQId}`, {
        token: chef.data.token,
      });
      check(
        "chef GET Question même secteur → 200",
        chefGetQ.status === 200,
        `HTTP ${chefGetQ.status}`,
      );
      try {
        await sql`delete from public.requests where id = ${chefQId}::uuid`;
      } catch {
        // best-effort cleanup
      }
    }
  }

  const proCross = await fetchJson(`/api/v1/requests/${requestOtherSector}`, {
    token: pro.data.token,
  });
  check(
    "lab GET other sector → 403",
    proCross.status === 403,
    `HTTP ${proCross.status}`,
  );

  // --- PATCH statut mauvais secteur → 403 -----------------------------------
  const patchCross = await fetchJson(`/api/v1/requests/${requestOtherSector}`, {
    method: "PATCH",
    token: pro.data.token,
    body: { status: "closed" },
  });
  check(
    "PATCH statut mauvais secteur → 403",
    patchCross.status === 403,
    `HTTP ${patchCross.status}`,
  );

  // --- lab sans secteur → deny ----------------------------------------------
  const sectorRows = await sql`
    select sector_id::text as sector_id
      from public.profiles
     where id = ${PRO_ID}::uuid
  `;
  savedProSector = sectorRows[0]?.sector_id ?? SECTOR_PRO;

  await sql`
    update public.profiles
       set sector_id = null
     where id = ${PRO_ID}::uuid
  `;

  const proNoSector = await login("prothesiste@local.dev");
  check(
    "re-login prothésiste sans secteur",
    proNoSector.status === 200 &&
      Boolean(proNoSector.data?.token) &&
      proNoSector.data?.profile?.sectorId == null,
    `sectorId=${proNoSector.data?.profile?.sectorId ?? "null"}`,
  );

  if (proNoSector.data?.token) {
    const emptyList = await fetchJson(
      `/api/v1/requests?subjects=${encodeURIComponent("Infos complémentaires")}&limit=200`,
      { token: proNoSector.data.token },
    );
    check(
      "lab sans secteur → list vide",
      emptyList.status === 200 &&
        Array.isArray(emptyList.data?.requests) &&
        emptyList.data.requests.length === 0,
      `n=${emptyList.data?.requests?.length ?? "?"}`,
    );

    const denyGet = await fetchJson(`/api/v1/requests/${requestA}`, {
      token: proNoSector.data.token,
    });
    check(
      "lab sans secteur → GET 403",
      denyGet.status === 403,
      `HTTP ${denyGet.status}`,
    );

    const denyPatch = await fetchJson(`/api/v1/requests/${requestA}`, {
      method: "PATCH",
      token: proNoSector.data.token,
      body: { status: "closed" },
    });
    check(
      "lab sans secteur → PATCH 403",
      denyPatch.status === 403,
      `HTTP ${denyPatch.status}`,
    );
  }
} finally {
  // Restore pro sector + cleanup smoke rows
  try {
    await sql`
      update public.profiles
         set sector_id = ${savedProSector}::uuid
       where id = ${PRO_ID}::uuid
    `;
  } catch (e) {
    console.error("restore pro sector failed", e);
  }
  try {
    if (requestA) {
      await sql`delete from public.requests where id = ${requestA}::uuid`;
    }
    if (requestB) {
      await sql`delete from public.requests where id = ${requestB}::uuid`;
    }
    if (requestOtherSector) {
      await sql`delete from public.requests where id = ${requestOtherSector}::uuid`;
    }
    await sql`delete from public.sessions where user_id = ${pracBId}::uuid`;
    await sql`delete from public.profiles where id = ${pracBId}::uuid`;
    await sql`delete from public.users where id = ${pracBId}::uuid`;
  } catch (e) {
    console.error("cleanup failed", e);
  }
  await sql.end({ timeout: 5 });
}

console.log(`\nDone. failures=${failed}`);
process.exitCode = failed > 0 ? 1 : 0;
