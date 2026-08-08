/**
 * Smoke S6 — API demandes (authZ list/create/get/patch, anti-énumération UUID).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s6-requests.mjs
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
const routeSrc = read("app/api/v1/requests/route.ts");
const idRouteSrc = read("app/api/v1/requests/[id]/route.ts");
const accessSrc = read("lib/api/v1/access.ts");
const idsSrc = read("lib/api/v1/ids.ts");
const schemaSrc = read("db/migrations/001_schema.sql");

check(
  "isUuid helper present",
  idsSrc.includes("export function isUuid") && idsSrc.includes("UUID_RE"),
);
check(
  "create restricted to practitioner",
  routeSrc.includes('profile.role !== "practitioner"') &&
    routeSrc.includes('error: "forbidden"'),
);
check(
  "create validates sector UUID",
  routeSrc.includes("!isUuid(sectorId)") &&
    routeSrc.includes("invalid_sector"),
);
check(
  "admin sectorId filter validates UUID",
  routeSrc.includes("rawSector && !isUuid(rawSector)"),
);
check(
  "list sectorId filter admin-only",
  routeSrc.includes('profile.role === "admin" && rawSector'),
);
check(
  "GET/PATCH anti-enum invalid UUID → 403",
  idRouteSrc.includes("!isUuid(id)") &&
    idRouteSrc.includes('error: "forbidden"'),
);
check(
  "canAccessRequest fail-closed invalid UUID",
  accessSrc.includes("if (!isUuid(requestId)) return false"),
);
check(
  "list message preview (P2-7 S6)",
  read("lib/requests/pg.ts").includes("previewRequestMessage") &&
    read("lib/requests/types.ts").includes("REQUEST_LIST_MESSAGE_PREVIEW_CHARS"),
);
check(
  "DB rate-limit trigger present",
  schemaSrc.includes("enforce_request_creation_rate_limit") &&
    schemaSrc.includes("REQUEST_RATE_LIMIT") &&
    schemaSrc.includes("requests_rate_limit"),
);
const protectMig = read("db/migrations/002_protect_request_update_fields.sql");
check(
  "protect_request_update_fields in db/migrations (defense-in-depth)",
  schemaSrc.includes("protect_request_update_fields") &&
    protectMig.includes("protect_request_update_fields") &&
    protectMig.includes("request content and ownership are immutable"),
);

console.log(`\nSmoke S6 against ${baseUrl}\n`);

const sql = postgres(databaseUrl, { max: 1 });
const stamp = Date.now();
const pracBId = randomUUID();
const pracBEmail = `smoke-s6-prac-${stamp}@local.dev`;
const createdIds = [];

try {
  const hash = await bcrypt.hash(PASS, 10);
  await sql`
    insert into public.users (id, email, password_hash, email_confirmed_at)
    values (${pracBId}::uuid, ${pracBEmail}, ${hash}, now())
  `;
  await sql`
    update public.profiles
       set role = 'practitioner',
           full_name = 'Smoke S6 Praticien B',
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

  const admin = await login("admin@local.dev");
  check(
    "login admin",
    admin.status === 200 && Boolean(admin.data?.token),
    `HTTP ${admin.status}`,
  );
  if (!admin.data?.token) throw new Error("abort: no admin token");

  const lab = await login("prothesiste@local.dev");
  check(
    "login prothésiste",
    lab.status === 200 && Boolean(lab.data?.token),
    `HTTP ${lab.status}`,
  );
  if (!lab.data?.token) throw new Error("abort: no lab token");

  const chef = await login("chef@local.dev");
  check(
    "login chef",
    chef.status === 200 && Boolean(chef.data?.token),
    `HTTP ${chef.status}`,
  );
  if (!chef.data?.token) throw new Error("abort: no chef token");

  // --- create hors praticien → 403 ------------------------------------------
  for (const [name, token] of [
    ["admin", admin.data.token],
    ["lab", lab.data.token],
    ["chef", chef.data.token],
  ]) {
    const c = await fetchJson("/api/v1/requests", {
      method: "POST",
      token,
      body: {
        subject: "Question",
        message: "Smoke S6 — create interdit pour ce rôle.",
        patientName: "Patient S6 Block",
        sectorId: SECTOR_PRO,
      },
    });
    check(
      `create ${name} → 403`,
      c.status === 403 && c.data?.error === "forbidden",
      `HTTP ${c.status}`,
    );
  }

  // --- create praticien OK + invalid sector ---------------------------------
  const createdA = await fetchJson("/api/v1/requests", {
    method: "POST",
    token: pracA.data.token,
    body: {
      subject: "Question",
      message: "Smoke S6 — demande praticien A secteur pro.",
      patientName: "Patient S6 A",
      sectorId: SECTOR_PRO,
    },
  });
  check(
    "create praticien → 201",
    createdA.status === 201 && Boolean(createdA.data?.id),
    `HTTP ${createdA.status}`,
  );
  if (createdA.data?.id) createdIds.push(createdA.data.id);
  const requestA = createdA.data?.id;

  const badSector = await fetchJson("/api/v1/requests", {
    method: "POST",
    token: pracA.data.token,
    body: {
      subject: "Question",
      message: "Smoke S6 — sectorId invalide.",
      patientName: "Patient S6 Bad",
      sectorId: "not-a-uuid",
    },
  });
  check(
    "create sectorId invalide → 400",
    badSector.status === 400 && badSector.data?.error === "invalid_sector",
    `HTTP ${badSector.status}`,
  );

  const createdOther = await fetchJson("/api/v1/requests", {
    method: "POST",
    token: pracA.data.token,
    body: {
      subject: "Infos complémentaires",
      message: "Smoke S6 — demande praticien A secteur chef.",
      patientName: "Patient S6 other",
      sectorId: SECTOR_CHEF,
    },
  });
  check(
    "create other sector → 201",
    createdOther.status === 201 && Boolean(createdOther.data?.id),
    `HTTP ${createdOther.status}`,
  );
  if (createdOther.data?.id) createdIds.push(createdOther.data.id);
  const requestOther = createdOther.data?.id;

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
      subject: "Urgence",
      message: "Smoke S6 — demande praticien B (IDOR target).",
      patientName: "Patient S6 B",
      sectorId: SECTOR_PRO,
    },
  });
  check(
    "create praticien B → 201",
    createdB.status === 201 && Boolean(createdB.data?.id),
    `HTTP ${createdB.status}`,
  );
  if (createdB.data?.id) createdIds.push(createdB.data.id);
  const requestB = createdB.data?.id;

  // --- scopes list cross-rôle -----------------------------------------------
  const pracList = await fetchJson("/api/v1/requests?limit=200", {
    token: pracA.data.token,
  });
  const pracRows = pracList.data?.requests ?? [];
  const pracOwners = new Set(pracRows.map((r) => r.profile_id));
  check(
    "list praticien = own only",
    pracList.status === 200 &&
      pracOwners.size === 1 &&
      pracOwners.has(pracA.data.profile?.id ?? pracRows[0]?.profile_id),
    `owners=${pracOwners.size} n=${pracRows.length}`,
  );
  check(
    "list praticien A n’inclut pas requête B",
    !pracRows.some((r) => r.id === requestB),
  );

  const labList = await fetchJson("/api/v1/requests?limit=200", {
    token: lab.data.token,
  });
  const labRows = labList.data?.requests ?? [];
  check(
    "list lab scoped sector",
    labList.status === 200 &&
      labRows.every((r) => r.sector_id === SECTOR_PRO),
    `n=${labRows.length}`,
  );
  check(
    "list lab exclut Question/Urgence (S5)",
    !labRows.some((r) => r.id === requestA || r.id === requestB) &&
      labRows.every(
        (r) => r.subject === "Infos complémentaires" || r.subject === "Demande",
      ),
    `n=${labRows.length}`,
  );
  check(
    "list lab ignore sectorId query (pas d’élargissement)",
    (
      await fetchJson(
        `/api/v1/requests?sectorId=${SECTOR_CHEF}&limit=200`,
        { token: lab.data.token },
      )
    ).data?.requests?.every((r) => r.sector_id === SECTOR_PRO) !== false,
  );

  const chefList = await fetchJson("/api/v1/requests?limit=200", {
    token: chef.data.token,
  });
  const chefRows = chefList.data?.requests ?? [];
  check(
    "list chef scoped sector",
    chefList.status === 200 &&
      chefRows.every((r) => r.sector_id === SECTOR_CHEF),
    `n=${chefRows.length}`,
  );

  const adminBadFilter = await fetchJson(
    "/api/v1/requests?sectorId=not-a-uuid&limit=1",
    { token: admin.data.token },
  );
  check(
    "admin list sectorId invalide → 400",
    adminBadFilter.status === 400 &&
      adminBadFilter.data?.error === "invalid_sector",
    `HTTP ${adminBadFilter.status}`,
  );

  const adminFilter = await fetchJson(
    `/api/v1/requests?sectorId=${SECTOR_PRO}&limit=200`,
    { token: admin.data.token },
  );
  check(
    "admin list sectorId filter OK",
    adminFilter.status === 200 &&
      (adminFilter.data?.requests ?? []).every(
        (r) => r.sector_id === SECTOR_PRO,
      ),
    `n=${adminFilter.data?.requests?.length ?? 0}`,
  );

  // --- GET UUID autre user / anti-énumération -------------------------------
  const idor = await fetchJson(`/api/v1/requests/${requestB}`, {
    token: pracA.data.token,
  });
  check(
    "GET UUID autre user → 403",
    idor.status === 403 && idor.data?.error === "forbidden",
    `HTTP ${idor.status}`,
  );

  const missing = await fetchJson(
    "/api/v1/requests/00000000-0000-4000-8000-000000000099",
    { token: pracA.data.token },
  );
  check(
    "GET UUID inexistant → 403",
    missing.status === 403 && missing.data?.error === "forbidden",
    `HTTP ${missing.status}`,
  );

  const invalid = await fetchJson("/api/v1/requests/not-a-uuid", {
    token: pracA.data.token,
  });
  check(
    "GET UUID invalide → 403 (pas 500)",
    invalid.status === 403 && invalid.data?.error === "forbidden",
    `HTTP ${invalid.status}`,
  );

  const own = await fetchJson(`/api/v1/requests/${requestA}`, {
    token: pracA.data.token,
  });
  check(
    "GET own → 200 + patient_name",
    own.status === 200 && own.data?.request?.patient_name === "Patient S6 A",
    `HTTP ${own.status}`,
  );

  const labCross = await fetchJson(`/api/v1/requests/${requestOther}`, {
    token: lab.data.token,
  });
  check(
    "lab GET autre secteur → 403",
    labCross.status === 403,
    `HTTP ${labCross.status}`,
  );

  const labGetQuestion = await fetchJson(`/api/v1/requests/${requestA}`, {
    token: lab.data.token,
  });
  check(
    "lab GET Question même secteur → 403 (S5)",
    labGetQuestion.status === 403,
    `HTTP ${labGetQuestion.status}`,
  );

  // Infos complémentaires same sector — lab peut GET/PATCH ; list = aperçu message.
  const longMsg =
    "Smoke S6 — message long pour aperçu list. " + "x".repeat(200);
  const createdLab = await fetchJson("/api/v1/requests", {
    method: "POST",
    token: pracA.data.token,
    body: {
      subject: "Infos complémentaires",
      message: longMsg,
      patientName: "Patient S6 Lab Infos",
      sectorId: SECTOR_PRO,
    },
  });
  check(
    "create Infos pour lab PATCH",
    createdLab.status === 201 && Boolean(createdLab.data?.id),
    `HTTP ${createdLab.status}`,
  );
  if (createdLab.data?.id) createdIds.push(createdLab.data.id);
  const requestLab = createdLab.data?.id;

  if (requestLab) {
    const labListPreview = await fetchJson("/api/v1/requests?limit=200", {
      token: lab.data.token,
    });
    const previewRow = (labListPreview.data?.requests ?? []).find(
      (r) => r.id === requestLab,
    );
    check(
      "list message aperçu ≤120 + ellipsis (S6)",
      Boolean(previewRow) &&
        typeof previewRow.message === "string" &&
        previewRow.message.length <= 121 &&
        previewRow.message.endsWith("…") &&
        previewRow.patient_name === "Patient S6 Lab Infos",
      `len=${previewRow?.message?.length ?? "?"}`,
    );

    const labDetail = await fetchJson(`/api/v1/requests/${requestLab}`, {
      token: lab.data.token,
    });
    check(
      "GET détail message complet (S6)",
      labDetail.status === 200 &&
        labDetail.data?.request?.message === longMsg &&
        labDetail.data?.request?.patient_name === "Patient S6 Lab Infos",
      `HTTP ${labDetail.status}`,
    );
  }

  // --- PATCH open/closed mauvais rôle ---------------------------------------
  const pracPatch = await fetchJson(`/api/v1/requests/${requestA}`, {
    method: "PATCH",
    token: pracA.data.token,
    body: { status: "closed" },
  });
  check(
    "PATCH praticien → 403",
    pracPatch.status === 403,
    `HTTP ${pracPatch.status}`,
  );

  const labPatchCross = await fetchJson(`/api/v1/requests/${requestOther}`, {
    method: "PATCH",
    token: lab.data.token,
    body: { status: "closed" },
  });
  check(
    "PATCH lab mauvais secteur → 403",
    labPatchCross.status === 403,
    `HTTP ${labPatchCross.status}`,
  );

  const labPatchQuestion = await fetchJson(`/api/v1/requests/${requestA}`, {
    method: "PATCH",
    token: lab.data.token,
    body: { status: "closed" },
  });
  check(
    "PATCH lab Question → 403 (S5)",
    labPatchQuestion.status === 403,
    `HTTP ${labPatchQuestion.status}`,
  );

  const labPatchOk = await fetchJson(`/api/v1/requests/${requestLab}`, {
    method: "PATCH",
    token: lab.data.token,
    body: { status: "closed" },
  });
  check(
    "PATCH lab Infos same sector closed → 200",
    labPatchOk.status === 200 && labPatchOk.data?.status === "closed",
    `HTTP ${labPatchOk.status}`,
  );

  const labReopen = await fetchJson(`/api/v1/requests/${requestLab}`, {
    method: "PATCH",
    token: lab.data.token,
    body: { status: "open" },
  });
  check(
    "PATCH lab reopen → 200",
    labReopen.status === 200 && labReopen.data?.status === "open",
    `HTTP ${labReopen.status}`,
  );

  const invalidPatch = await fetchJson("/api/v1/requests/not-a-uuid", {
    method: "PATCH",
    token: lab.data.token,
    body: { status: "closed" },
  });
  check(
    "PATCH UUID invalide → 403",
    invalidPatch.status === 403,
    `HTTP ${invalidPatch.status}`,
  );

  // --- rate-limit create (DB trigger) ---------------------------------------
  const rateIds = [];
  let hit429 = false;
  for (let i = 0; i < 6; i += 1) {
    const r = await fetchJson("/api/v1/requests", {
      method: "POST",
      token: pracB.data.token,
      body: {
        subject: "Question",
        message: `Smoke S6 rate-limit probe #${i + 1} xxxxxxxxxx`,
        patientName: `Patient S6 RL ${i}`,
        sectorId: SECTOR_PRO,
      },
    });
    if (r.status === 201 && r.data?.id) {
      rateIds.push(r.data.id);
      createdIds.push(r.data.id);
    }
    if (r.status === 429 && r.data?.error === "rate_limit") {
      hit429 = true;
      break;
    }
  }
  check(
    "create rate-limit → 429 (≤5 / 15 min)",
    hit429,
    `created=${rateIds.length} hit429=${hit429}`,
  );

  // --- protect_request_update_fields (DB defense-in-depth) -------------------
  if (requestA) {
    let blocked = false;
    try {
      await sql`
        update public.requests
           set message = 'Smoke S6 — should be blocked by trigger'
         where id = ${requestA}::uuid
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      blocked =
        msg.includes("immutable") ||
        e?.code === "42501" ||
        String(e?.code ?? "") === "42501";
    }
    check(
      "DB trigger blocks non-status UPDATE",
      blocked,
      blocked ? "blocked" : "UPDATE allowed (trigger missing?)",
    );

    const statusOnly = await sql`
      update public.requests
         set status = 'open'
       where id = ${requestA}::uuid
      returning id::text, status
    `;
    check(
      "DB trigger allows status-only UPDATE",
      statusOnly.length === 1 && statusOnly[0].status === "open",
    );
  }
} finally {
  try {
    for (const id of createdIds) {
      await sql`delete from public.requests where id = ${id}::uuid`;
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
