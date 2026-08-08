/**
 * Smoke S7 — messages/chat IDOR (read / write / mark-read / since).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s7-messages.mjs
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
const msgSrc = read("app/api/v1/requests/[id]/messages/route.ts");
const accessSrc = read("lib/api/v1/access.ts");
const notifySrc = read("lib/push/notify.ts");
const apiChatSrc = read("lib/requests/api-chat.ts");

check(
  "GET messages gated by canAccessRequest",
  msgSrc.includes("canAccessRequest") &&
    /GET[\s\S]*canAccessRequest\(profile, id\)/.test(msgSrc),
);
check(
  "POST messages gated by canReplyToRequest",
  msgSrc.includes("canReplyToRequest") &&
    /POST[\s\S]*canReplyToRequest\(profile, id\)/.test(msgSrc),
);
check(
  "POST body max 2000",
  msgSrc.includes("text.length > 2000") &&
    msgSrc.includes('error: "invalid_body"'),
);
check(
  "POST messages rate-limit process-local (per sender)",
  msgSrc.includes("consumeRateLimit") &&
    msgSrc.includes("RATE_LIMITS.messages") &&
    msgSrc.includes("rateLimitedJson"),
);
check(
  "POST sender_id = profile.id (pas de spoof client)",
  msgSrc.includes("${profile.id}::uuid") &&
    msgSrc.includes("insert into public.request_messages"),
);
check(
  "since invalide → 400 (pas de cast Postgres brut)",
  msgSrc.includes("invalid_since") &&
    msgSrc.includes("Date.parse(sinceRaw)") &&
    msgSrc.includes("toISOString()"),
);
check(
  "mark-as-read seulement sans since (full load)",
  msgSrc.includes("if (!sinceIso)") &&
    msgSrc.includes("request_thread_reads"),
);
check(
  "canReplyToRequest = accès + Q/U + (open | closed owner)",
  accessSrc.includes("canReplyToRequest") &&
    accessSrc.includes('request.subject !== "Question"') &&
    accessSrc.includes('request.status === "closed"') &&
    accessSrc.includes("request.profile_id === profile.id"),
);
check(
  "web api-chat maps 401/403/429/5xx (P2-7 S7)",
  read("lib/requests/api-chat.ts").includes("messageForHttpStatus") &&
    read("lib/requests/api-chat.ts").includes("Session expirée") &&
    read("lib/requests/api-chat.ts").includes("Vous n’avez pas accès"),
);
check(
  "notify reply → owner only + skip self",
  notifySrc.includes("getRequestOwnerTokens") &&
    notifySrc.includes("message.sender_id === request.profile_id"),
);
check(
  "api-chat client credentials include (cookie web)",
  apiChatSrc.includes('credentials: "include"') &&
    apiChatSrc.includes("/messages"),
);

console.log(`\nSmoke S7 against ${baseUrl}\n`);

const sql = postgres(databaseUrl, { max: 1 });
const stamp = Date.now();
const pracBId = randomUUID();
const pracBEmail = `smoke-s7-prac-${stamp}@local.dev`;
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
           full_name = 'Smoke S7 Praticien B',
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

  const pracB = await login(pracBEmail);
  check(
    "login praticien B",
    pracB.status === 200 && Boolean(pracB.data?.token),
    `HTTP ${pracB.status}`,
  );
  if (!pracB.data?.token) throw new Error("abort: no prac B token");

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

  // --- fixtures (SQL : évite rate-limit create ≤5/15min du praticien A) ------
  const pracAId = pracA.data.profile.id;
  await sql`alter table public.requests disable trigger requests_rate_limit`;

  async function insertRequest({
    subject,
    message,
    patientName,
    sectorId,
    profileId,
    status = "open",
  }) {
    const id = randomUUID();
    await sql`
      insert into public.requests (
        id, subject, message, patient_name, sector_id, profile_id, created_by, status
      ) values (
        ${id}::uuid,
        ${subject},
        ${message},
        ${patientName},
        ${sectorId}::uuid,
        ${profileId}::uuid,
        ${profileId}::uuid,
        ${status}
      )
    `;
    createdIds.push(id);
    return id;
  }

  const requestQ = await insertRequest({
    subject: "Question",
    message: "Smoke S7 — Question ouverte secteur pro.",
    patientName: "Patient S7 Q",
    sectorId: SECTOR_PRO,
    profileId: pracAId,
  });
  check("fixture Question open", Boolean(requestQ));

  const requestClosed = await insertRequest({
    subject: "Urgence",
    message: "Smoke S7 — Urgence fermée.",
    patientName: "Patient S7 U",
    sectorId: SECTOR_PRO,
    profileId: pracAId,
    status: "closed",
  });
  check("fixture Urgence closed", Boolean(requestClosed));

  const requestProt = await insertRequest({
    subject: "Modifications prothèse",
    message: "Smoke S7 — sujet hors chat (prothèse).",
    patientName: "Patient S7 P",
    sectorId: SECTOR_PRO,
    profileId: pracAId,
  });
  check("fixture Modifications prothèse", Boolean(requestProt));

  const requestInfos = await insertRequest({
    subject: "Infos complémentaires",
    message: "Smoke S7 — Infos complémentaires hors chat.",
    patientName: "Patient S7 I",
    sectorId: SECTOR_PRO,
    profileId: pracAId,
  });
  check("fixture Infos complémentaires", Boolean(requestInfos));

  const requestChefSector = await insertRequest({
    subject: "Question",
    message: "Smoke S7 — Question secteur chef (IDOR lab).",
    patientName: "Patient S7 Chef",
    sectorId: SECTOR_CHEF,
    profileId: pracAId,
  });
  check("fixture Question secteur chef", Boolean(requestChefSector));

  const requestB = await insertRequest({
    subject: "Question",
    message: "Smoke S7 — Question praticien B (IDOR).",
    patientName: "Patient S7 B",
    sectorId: SECTOR_PRO,
    profileId: pracBId,
  });
  check("fixture Question praticien B", Boolean(requestB));

  await sql`alter table public.requests enable trigger requests_rate_limit`;

  // --- unauth / anti-enum ----------------------------------------------------
  const unauth = await fetchJson(`/api/v1/requests/${requestQ}/messages`);
  check(
    "GET messages unauth → 401",
    unauth.status === 401 && unauth.data?.error === "unauthorized",
    `HTTP ${unauth.status}`,
  );

  const badUuid = await fetchJson("/api/v1/requests/not-a-uuid/messages", {
    token: pracA.data.token,
  });
  check(
    "GET UUID invalide → 403",
    badUuid.status === 403 && badUuid.data?.error === "forbidden",
    `HTTP ${badUuid.status}`,
  );

  const missing = await fetchJson(
    "/api/v1/requests/00000000-0000-4000-8000-000000000099/messages",
    { token: pracA.data.token },
  );
  check(
    "GET UUID inexistant → 403",
    missing.status === 403 && missing.data?.error === "forbidden",
    `HTTP ${missing.status}`,
  );

  // --- IDOR read -------------------------------------------------------------
  const idorGet = await fetchJson(`/api/v1/requests/${requestB}/messages`, {
    token: pracA.data.token,
  });
  check(
    "poll requête inaccessible (praticien A→B) → 403",
    idorGet.status === 403 && idorGet.data?.error === "forbidden",
    `HTTP ${idorGet.status}`,
  );

  const labWrongSector = await fetchJson(
    `/api/v1/requests/${requestChefSector}/messages`,
    { token: lab.data.token },
  );
  check(
    "poll lab hors secteur → 403",
    labWrongSector.status === 403 && labWrongSector.data?.error === "forbidden",
    `HTTP ${labWrongSector.status}`,
  );

  const chefOk = await fetchJson(
    `/api/v1/requests/${requestChefSector}/messages`,
    { token: chef.data.token },
  );
  check(
    "GET messages chef même secteur → 200",
    chefOk.status === 200 && Array.isArray(chefOk.data?.messages),
    `HTTP ${chefOk.status}`,
  );

  // --- write rules -----------------------------------------------------------
  // P2-7 / S5 : prothésiste ne peut plus répondre sur Question (UI + API).
  const labReplyDenied = await fetchJson(
    `/api/v1/requests/${requestQ}/messages`,
    {
      method: "POST",
      token: lab.data.token,
      body: { body: "Smoke S7 — prothésiste sur Question (deny)." },
    },
  );
  check(
    "reply prothésiste sur Question → 403 (S5)",
    labReplyDenied.status === 403 &&
      labReplyDenied.data?.error === "forbidden",
    `HTTP ${labReplyDenied.status}`,
  );

  const chefReply = await fetchJson(
    `/api/v1/requests/${requestChefSector}/messages`,
    {
      method: "POST",
      token: chef.data.token,
      body: { body: "Smoke S7 — réponse chef sur Question ouverte." },
    },
  );
  check(
    "reply chef sur Question open → 201",
    chefReply.status === 201 && Boolean(chefReply.data?.id),
    `HTTP ${chefReply.status}`,
  );
  check(
    "reply chef sender_id = chef profile",
    chefReply.data?.sender_id === chef.data?.profile?.id,
    `sender=${chefReply.data?.sender_id}`,
  );

  const closedNonOwner = await fetchJson(
    `/api/v1/requests/${requestClosed}/messages`,
    {
      method: "POST",
      token: lab.data.token,
      body: { body: "Smoke S7 — lab sur thread fermé." },
    },
  );
  check(
    "reply closed non-owner → 403",
    closedNonOwner.status === 403 &&
      closedNonOwner.data?.error === "forbidden",
    `HTTP ${closedNonOwner.status}`,
  );

  const closedOwner = await fetchJson(
    `/api/v1/requests/${requestClosed}/messages`,
    {
      method: "POST",
      token: pracA.data.token,
      body: { body: "Smoke S7 — owner réouvre le fil." },
    },
  );
  check(
    "reply closed owner → 201 (reopen)",
    closedOwner.status === 201 && Boolean(closedOwner.data?.id),
    `HTTP ${closedOwner.status}`,
  );

  const reopened = await fetchJson(`/api/v1/requests/${requestClosed}`, {
    token: pracA.data.token,
  });
  check(
    "trigger reopen status → open",
    reopened.data?.request?.status === "open",
    `status=${reopened.data?.request?.status}`,
  );

  const replyProt = await fetchJson(`/api/v1/requests/${requestProt}/messages`, {
    method: "POST",
    token: lab.data.token,
    body: { body: "Smoke S7 — reply sujet prothèse." },
  });
  check(
    "reply sujet prothèse → 403",
    replyProt.status === 403 && replyProt.data?.error === "forbidden",
    `HTTP ${replyProt.status}`,
  );

  const replyInfos = await fetchJson(
    `/api/v1/requests/${requestInfos}/messages`,
    {
      method: "POST",
      token: lab.data.token,
      body: { body: "Smoke S7 — reply Infos complémentaires." },
    },
  );
  check(
    "reply sujet Infos complémentaires → 403",
    replyInfos.status === 403 && replyInfos.data?.error === "forbidden",
    `HTTP ${replyInfos.status}`,
  );

  const tooLong = await fetchJson(`/api/v1/requests/${requestQ}/messages`, {
    method: "POST",
    token: pracA.data.token,
    body: { body: "x".repeat(2001) },
  });
  check(
    "body >2000 → 400 invalid_body",
    tooLong.status === 400 && tooLong.data?.error === "invalid_body",
    `HTTP ${tooLong.status}`,
  );

  const empty = await fetchJson(`/api/v1/requests/${requestQ}/messages`, {
    method: "POST",
    token: pracA.data.token,
    body: { body: "   " },
  });
  check(
    "body vide → 400 invalid_body",
    empty.status === 400 && empty.data?.error === "invalid_body",
    `HTTP ${empty.status}`,
  );

  const idorPost = await fetchJson(`/api/v1/requests/${requestB}/messages`, {
    method: "POST",
    token: pracA.data.token,
    body: { body: "Smoke S7 — IDOR write." },
  });
  check(
    "POST requête inaccessible → 403",
    idorPost.status === 403 && idorPost.data?.error === "forbidden",
    `HTTP ${idorPost.status}`,
  );

  // --- since validation + mark-as-read --------------------------------------
  const badSince = await fetchJson(
    `/api/v1/requests/${requestQ}/messages?since=not-a-date`,
    { token: pracA.data.token },
  );
  check(
    "since invalide → 400 invalid_since",
    badSince.status === 400 && badSince.data?.error === "invalid_since",
    `HTTP ${badSince.status}`,
  );

  await sql`
    delete from public.request_thread_reads
     where request_id = ${requestQ}::uuid
       and profile_id = ${pracAId}::uuid
  `;

  const sinceIso = new Date(Date.now() - 60_000).toISOString();
  const poll = await fetchJson(
    `/api/v1/requests/${requestQ}/messages?since=${encodeURIComponent(sinceIso)}`,
    { token: pracA.data.token },
  );
  check(
    "poll with since → 200",
    poll.status === 200 && Array.isArray(poll.data?.messages),
    `HTTP ${poll.status} n=${poll.data?.messages?.length ?? 0}`,
  );

  const readsAfterPoll = await sql`
    select 1 as ok
      from public.request_thread_reads
     where request_id = ${requestQ}::uuid
       and profile_id = ${pracAId}::uuid
     limit 1
  `;
  check(
    "poll with since ne mark-as-read pas",
    readsAfterPoll.length === 0,
  );

  const full = await fetchJson(`/api/v1/requests/${requestQ}/messages`, {
    token: pracA.data.token,
  });
  check(
    "GET full load → 200",
    full.status === 200 && Array.isArray(full.data?.messages),
    `HTTP ${full.status} n=${full.data?.messages?.length ?? 0}`,
  );

  const readsAfterFull = await sql`
    select 1 as ok
      from public.request_thread_reads
     where request_id = ${requestQ}::uuid
       and profile_id = ${pracAId}::uuid
     limit 1
  `;
  check("full load mark-as-read (own profile)", readsAfterFull.length === 1);

  // IDOR mark-read : inaccessible request ne crée pas de row
  await sql`
    delete from public.request_thread_reads
     where request_id = ${requestB}::uuid
       and profile_id = ${pracAId}::uuid
  `;
  const idorMark = await fetchJson(`/api/v1/requests/${requestB}/messages`, {
    token: pracA.data.token,
  });
  const readsIdor = await sql`
    select 1 as ok
      from public.request_thread_reads
     where request_id = ${requestB}::uuid
       and profile_id = ${pracAId}::uuid
     limit 1
  `;
  check(
    "mark-as-read IDOR bloqué (403 + pas de row)",
    idorMark.status === 403 && readsIdor.length === 0,
    `HTTP ${idorMark.status} rows=${readsIdor.length}`,
  );
} finally {
  if (createdIds.length > 0) {
    await sql`
      delete from public.requests where id = any(${createdIds}::uuid[])
    `;
  }
  await sql`delete from public.users where id = ${pracBId}::uuid`;
  await sql.end({ timeout: 5 });
}

console.log("");
if (failed > 0) {
  console.error(`Smoke S7 FAILED (${failed} check(s))`);
  process.exit(1);
}
console.log("Smoke S7 all good");
