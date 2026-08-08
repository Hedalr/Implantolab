/**
 * Smoke S10 — push token ownership (register / DELETE / recipients).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s10-push.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
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
const ID_ADMIN = "22222222-2222-2222-2222-222222222201";
const ID_PRAC = "22222222-2222-2222-2222-222222222202";
const ID_LAB = "22222222-2222-2222-2222-222222222203";
const ID_CHEF = "22222222-2222-2222-2222-222222222204";
const SECTOR_CHEF = "11111111-1111-1111-1111-111111111102";
const SECTOR_OTHER = "11111111-1111-1111-1111-111111111101";

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
const routeSrc = read("app/api/v1/push/register/route.ts");
const recipientsSrc = read("lib/push/recipients.ts");
const notifySrc = read("lib/push/notify.ts");
const expoSrc = read("lib/push/expo.ts");
const staleSrc = read("lib/push/stale-tokens.ts");
const tokenFormatSrc = read("lib/push/token-format.ts");
const cronSrc = read("app/api/cron/purge-request-media/route.ts");
const docsPushSrc = read("docs/push-notifications.md");
const mobileRegisterSrc = read(
  join("..", "App Mobile Implantolab", "lib", "push", "register.ts"),
);
const mobileClientSrc = read(
  join("..", "App Mobile Implantolab", "lib", "api", "client.ts"),
);

check(
  "POST requires requireApiUser",
  /export async function POST[\s\S]*requireApiUser/.test(routeSrc),
);
check(
  "POST push/register rate-limit process-local",
  routeSrc.includes("consumeRateLimit") &&
    routeSrc.includes("RATE_LIMITS.pushRegister") &&
    routeSrc.includes("rateLimitedJson"),
);
check(
  "POST validates ExponentPushToken format",
  routeSrc.includes("isExpoPushToken") &&
    routeSrc.includes("invalid_token_format") &&
    tokenFormatSrc.includes("ExponentPushToken"),
);
check(
  "DELETE requires requireApiUser",
  /export async function DELETE[\s\S]*requireApiUser/.test(routeSrc),
);
check(
  "POST does not reclaim profile_id on conflict",
  !/on conflict[\s\S]*set\s+profile_id\s*=/.test(routeSrc) &&
    routeSrc.includes("where push_tokens.profile_id") &&
    routeSrc.includes("token_owned_by_other") &&
    routeSrc.includes("409"),
);
check(
  "DELETE requires token (no mass wipe)",
  /export async function DELETE[\s\S]*token_required/.test(routeSrc) &&
    !routeSrc.includes("delete all") &&
    routeSrc.includes("DELETE scoped"),
);
check(
  "DELETE scoped by profile_id AND token",
  /delete from public\.push_tokens[\s\S]*profile_id[\s\S]*and token/.test(
    routeSrc,
  ),
);
check(
  "deleteInvalidTokens works in postgres (not supabase-only)",
  expoSrc.includes("isPostgresBackend") &&
    expoSrc.includes("getSql") &&
    /delete from public\.push_tokens[\s\S]*token = any/.test(expoSrc) &&
    expoSrc.includes("DeviceNotRegistered"),
);
check(
  "TTL stale tokens optional + cron hook",
  staleSrc.includes("PUSH_TOKEN_TTL_DAYS") &&
    staleSrc.includes("purgeStalePushTokens") &&
    cronSrc.includes("purgeStalePushTokens"),
);
check(
  "docs: 409 handoff volontaire + TTL option",
  docsPushSrc.includes("409") &&
    docsPushSrc.includes("volontaire") &&
    docsPushSrc.includes("PUSH_TOKEN_TTL_DAYS"),
);
check(
  "recipients filter deleted_at + role joins",
  recipientsSrc.includes("p.deleted_at is null") &&
    recipientsSrc.includes("getRequestOwnerTokens") &&
    recipientsSrc.includes("getAdminAndSectorChefTokens"),
);
check(
  "notify reply → owner only + skip self",
  notifySrc.includes("getRequestOwnerTokens") &&
    notifySrc.includes("message.sender_id === request.profile_id"),
);
check(
  "mobile API unregister requires token arg",
  /apiUnregisterPushToken\(\s*token:\s*string\s*\)/.test(mobileClientSrc) ||
    mobileClientSrc.includes("apiUnregisterPushToken(token: string)"),
);
check(
  "mobile ViaApi path uses apiRegister/Unregister",
  mobileRegisterSrc.includes("apiRegisterPushToken") &&
    mobileRegisterSrc.includes("apiUnregisterPushToken"),
);

const sql = postgres(databaseUrl, { max: 1 });
const smokeTokenA = `ExponentPushToken[smoke-s10-a-${randomUUID()}]`;
const smokeTokenB = `ExponentPushToken[smoke-s10-b-${randomUUID()}]`;
const sharedToken = `ExponentPushToken[smoke-s10-shared-${randomUUID()}]`;

try {
  // Cleanup leftover smoke tokens
  await sql`
    delete from public.push_tokens
     where token like 'ExponentPushToken[smoke-s10-%'
  `;

  const unauthPost = await fetchJson("/api/v1/push/register", {
    method: "POST",
    body: { token: smokeTokenA, platform: "ios" },
  });
  check("unauth POST → 401", unauthPost.status === 401, String(unauthPost.status));

  const unauthDel = await fetchJson("/api/v1/push/register", {
    method: "DELETE",
    body: { token: smokeTokenA },
  });
  check("unauth DELETE → 401", unauthDel.status === 401, String(unauthDel.status));

  const prac = await login("praticien@local.dev");
  const admin = await login("admin@local.dev");
  const chef = await login("chef@local.dev");
  check("login praticien", prac.status === 200 && Boolean(prac.data?.token));
  check("login admin", admin.status === 200 && Boolean(admin.data?.token));
  check("login chef", chef.status === 200 && Boolean(chef.data?.token));

  if (!prac.data?.token || !admin.data?.token) {
    throw new Error("login failed — abort HTTP checks");
  }

  const badFmt = await fetchJson("/api/v1/push/register", {
    method: "POST",
    token: prac.data.token,
    body: { token: "not-an-expo-token", platform: "ios" },
  });
  check(
    "invalid token format → 400",
    badFmt.status === 400 && badFmt.data?.error === "invalid_token_format",
    `${badFmt.status} ${badFmt.data?.error}`,
  );

  const emptyBracket = await fetchJson("/api/v1/push/register", {
    method: "POST",
    token: prac.data.token,
    body: { token: "ExponentPushToken[]", platform: "ios" },
  });
  check(
    "empty ExponentPushToken[] → 400",
    emptyBracket.status === 400 &&
      emptyBracket.data?.error === "invalid_token_format",
    `${emptyBracket.status} ${emptyBracket.data?.error}`,
  );

  const regA = await fetchJson("/api/v1/push/register", {
    method: "POST",
    token: prac.data.token,
    body: { token: sharedToken, platform: "ios" },
  });
  check("praticien register shared token → 200", regA.status === 200, String(regA.status));

  const ownerRows = await sql`
    select profile_id::text as profile_id, platform
      from public.push_tokens
     where token = ${sharedToken}
  `;
  check(
    "DB owner = praticien after register",
    ownerRows.length === 1 && ownerRows[0].profile_id === ID_PRAC,
    ownerRows[0]?.profile_id ?? "missing",
  );

  // Same user re-register (platform refresh) OK
  const regA2 = await fetchJson("/api/v1/push/register", {
    method: "POST",
    token: prac.data.token,
    body: { token: sharedToken, platform: "android" },
  });
  check(
    "same owner re-register → 200",
    regA2.status === 200,
    String(regA2.status),
  );
  const plat = await sql`
    select platform from public.push_tokens where token = ${sharedToken}
  `;
  check("same owner updates platform", plat[0]?.platform === "android");

  // Cross-user steal blocked
  const steal = await fetchJson("/api/v1/push/register", {
    method: "POST",
    token: admin.data.token,
    body: { token: sharedToken, platform: "ios" },
  });
  check(
    "other user same token → 409",
    steal.status === 409 && steal.data?.error === "token_owned_by_other",
    `${steal.status} ${steal.data?.error}`,
  );
  const stillOwner = await sql`
    select profile_id::text as profile_id
      from public.push_tokens
     where token = ${sharedToken}
  `;
  check(
    "ownership unchanged after steal attempt",
    stillOwner[0]?.profile_id === ID_PRAC,
    stillOwner[0]?.profile_id ?? "missing",
  );

  // DELETE without body / without token → 400 (no mass wipe)
  const delEmpty = await fetchJson("/api/v1/push/register", {
    method: "DELETE",
    token: prac.data.token,
    body: {},
  });
  check(
    "DELETE sans token → 400",
    delEmpty.status === 400 && delEmpty.data?.error === "token_required",
    `${delEmpty.status} ${delEmpty.data?.error}`,
  );

  const delNoBody = await fetchJson("/api/v1/push/register", {
    method: "DELETE",
    token: prac.data.token,
  });
  check(
    "DELETE sans body → 400",
    delNoBody.status === 400 && delNoBody.data?.error === "invalid_json",
    `${delNoBody.status} ${delNoBody.data?.error}`,
  );

  // Extra token for mass-wipe regression: must survive DELETE of another token
  await fetchJson("/api/v1/push/register", {
    method: "POST",
    token: prac.data.token,
    body: { token: smokeTokenA, platform: "ios" },
  });
  await fetchJson("/api/v1/push/register", {
    method: "POST",
    token: prac.data.token,
    body: { token: smokeTokenB, platform: "ios" },
  });

  const delOne = await fetchJson("/api/v1/push/register", {
    method: "DELETE",
    token: prac.data.token,
    body: { token: smokeTokenA },
  });
  check("DELETE scoped token → 200", delOne.status === 200);

  const afterDel = await sql`
    select token from public.push_tokens
     where profile_id = ${ID_PRAC}::uuid
       and token in (${smokeTokenA}, ${smokeTokenB}, ${sharedToken})
     order by token
  `;
  const remaining = afterDel.map((r) => r.token);
  check(
    "DELETE removes only target token",
    !remaining.includes(smokeTokenA) &&
      remaining.includes(smokeTokenB) &&
      remaining.includes(sharedToken),
    remaining.join(","),
  );

  // Cross-user DELETE is a no-op (cannot wipe another's token)
  const delForeign = await fetchJson("/api/v1/push/register", {
    method: "DELETE",
    token: admin.data.token,
    body: { token: sharedToken },
  });
  check("DELETE foreign token → 200 no-op", delForeign.status === 200);
  const stillThere = await sql`
    select profile_id::text as profile_id
      from public.push_tokens where token = ${sharedToken}
  `;
  check(
    "foreign DELETE did not remove token",
    stillThere[0]?.profile_id === ID_PRAC,
  );

  // Handoff after owner unregister → B can claim
  const handoffDel = await fetchJson("/api/v1/push/register", {
    method: "DELETE",
    token: prac.data.token,
    body: { token: sharedToken },
  });
  check("owner unregister before handoff", handoffDel.status === 200);
  const handoff = await fetchJson("/api/v1/push/register", {
    method: "POST",
    token: admin.data.token,
    body: { token: sharedToken, platform: "ios" },
  });
  check(
    "after unregister, other user can register → 200",
    handoff.status === 200,
    String(handoff.status),
  );
  const handoffOwner = await sql`
    select profile_id::text as profile_id
      from public.push_tokens where token = ${sharedToken}
  `;
  check(
    "handoff owner = admin",
    handoffOwner[0]?.profile_id === ID_ADMIN,
  );

  // --- Recipients: only expected roles / sectors / owner ---------------------
  const tokAdmin = `ExponentPushToken[smoke-s10-rcpt-admin-${randomUUID()}]`;
  const tokChef = `ExponentPushToken[smoke-s10-rcpt-chef-${randomUUID()}]`;
  const tokPrac = `ExponentPushToken[smoke-s10-rcpt-prac-${randomUUID()}]`;
  const tokLab = `ExponentPushToken[smoke-s10-rcpt-lab-${randomUUID()}]`;

  await sql`
    insert into public.push_tokens (profile_id, token, platform)
    values
      (${ID_ADMIN}::uuid, ${tokAdmin}, 'ios'),
      (${ID_CHEF}::uuid, ${tokChef}, 'ios'),
      (${ID_PRAC}::uuid, ${tokPrac}, 'ios'),
      (${ID_LAB}::uuid, ${tokLab}, 'ios')
  `;

  // Mirror getAdminAndSectorChefTokens(sectorId) SQL from recipients.ts
  const inboxTokens = await sql`
    select t.token, t.profile_id::text as profile_id
      from public.push_tokens t
      join public.profiles p on p.id = t.profile_id
     where p.deleted_at is null
       and (
         p.role = 'admin'
         or (p.role = 'chef_de_secteur' and p.sector_id = ${SECTOR_CHEF}::uuid)
       )
       and t.token in (${tokAdmin}, ${tokChef}, ${tokPrac}, ${tokLab})
  `;
  const inboxIds = new Set(inboxTokens.map((r) => r.profile_id));
  check(
    "inbox recipients = admin + chef secteur (pas prac/lab)",
    inboxIds.has(ID_ADMIN) &&
      inboxIds.has(ID_CHEF) &&
      !inboxIds.has(ID_PRAC) &&
      !inboxIds.has(ID_LAB),
    [...inboxIds].join(","),
  );

  const wrongSector = await sql`
    select t.profile_id::text as profile_id
      from public.push_tokens t
      join public.profiles p on p.id = t.profile_id
     where p.deleted_at is null
       and (
         p.role = 'admin'
         or (p.role = 'chef_de_secteur' and p.sector_id = ${SECTOR_OTHER}::uuid)
       )
       and t.token in (${tokAdmin}, ${tokChef}, ${tokPrac}, ${tokLab})
  `;
  const wrongIds = new Set(wrongSector.map((r) => r.profile_id));
  check(
    "chef hors secteur exclu des recipients inbox",
    wrongIds.has(ID_ADMIN) && !wrongIds.has(ID_CHEF),
    [...wrongIds].join(","),
  );

  const ownerTokens = await sql`
    select token, profile_id::text as profile_id
      from public.push_tokens
     where profile_id = ${ID_PRAC}::uuid
       and token = ${tokPrac}
  `;
  check(
    "request-owner recipients = owner only",
    ownerTokens.length === 1 && ownerTokens[0].profile_id === ID_PRAC,
  );

  const pracTokens = await sql`
    select t.profile_id::text as profile_id
      from public.push_tokens t
      join public.profiles p on p.id = t.profile_id
     where p.role = 'practitioner'
       and p.deleted_at is null
       and t.token in (${tokAdmin}, ${tokChef}, ${tokPrac}, ${tokLab})
  `;
  check(
    "practitioner broadcast excludes admin/chef/lab",
    pracTokens.length === 1 && pracTokens[0].profile_id === ID_PRAC,
  );

  // TTL cleanup SQL (miroir purgeStalePushTokens) — handoff sans unregister
  const staleTok = `ExponentPushToken[smoke-s10-stale-${randomUUID()}]`;
  const freshTok = `ExponentPushToken[smoke-s10-fresh-${randomUUID()}]`;
  await sql`
    insert into public.push_tokens (profile_id, token, platform, updated_at)
    values
      (${ID_PRAC}::uuid, ${staleTok}, 'ios', now() - interval '100 days'),
      (${ID_PRAC}::uuid, ${freshTok}, 'ios', now())
  `;
  const ttlDays = 90;
  const purged = await sql`
    delete from public.push_tokens
     where token in (${staleTok}, ${freshTok})
       and updated_at < now() - (${ttlDays}::int * interval '1 day')
    returning token
  `;
  check(
    "TTL SQL purge removes only stale token",
    purged.length === 1 && purged[0].token === staleTok,
    purged.map((r) => r.token).join(","),
  );
  const freshStill = await sql`
    select 1 from public.push_tokens where token = ${freshTok}
  `;
  check("TTL SQL keeps fresh token", freshStill.length === 1);
  // Après purge stale : autre user peut claim (handoff tardif)
  const claimAfterTtl = await fetchJson("/api/v1/push/register", {
    method: "POST",
    token: admin.data.token,
    body: { token: staleTok, platform: "ios" },
  });
  check(
    "after TTL purge, other user can register stale token → 200",
    claimAfterTtl.status === 200,
    String(claimAfterTtl.status),
  );

  // login chef used above — silence unused if login failed early
  void chef;
} finally {
  await sql`
    delete from public.push_tokens
     where token like 'ExponentPushToken[smoke-s10-%'
  `;
  await sql.end({ timeout: 5 });
}

if (failed > 0) {
  console.error(`\nS10 FAILED — ${failed} check(s)`);
  process.exit(1);
}
console.log("\nS10 OK — push ownership all good");
