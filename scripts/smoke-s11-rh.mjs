/**
 * Smoke S11 — RH admin API (authZ, tokens, matrice rôles, soft-delete admin).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s11-rh.mjs
 */
import { createHash, randomBytes } from "node:crypto";
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
const ID_ADMIN = "22222222-2222-2222-2222-222222222201";
const SECTOR_A = "11111111-1111-1111-1111-111111111101";
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

/** Mint un token connu (sha256) pour smokes — l’API ne renvoie plus le brut. */
function mintRawToken() {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

async function overwriteInviteToken(sql, userId) {
  const { raw, hash } = mintRawToken();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    update public.users
       set invite_token_hash = ${hash},
           invite_token_expires_at = ${expires}::timestamptz,
           password_reset_token_hash = null,
           password_reset_expires_at = null
     where id = ${userId}::uuid
  `;
  return raw;
}

async function overwriteResetToken(sql, userId) {
  const { raw, hash } = mintRawToken();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    update public.users
       set password_reset_token_hash = ${hash},
           password_reset_expires_at = ${expires}::timestamptz,
           invite_token_hash = null,
           invite_token_expires_at = null
     where id = ${userId}::uuid
  `;
  return raw;
}

function responseHasSecret(data) {
  if (!data || typeof data !== "object") return false;
  return (
    "inviteToken" in data ||
    "resetToken" in data ||
    "inviteUrl" in data ||
    Boolean(data.inviteToken) ||
    Boolean(data.resetToken) ||
    Boolean(data.inviteUrl)
  );
}

// --- Source guards -----------------------------------------------------------
const usersRoute = read("app/api/v1/rh/users/route.ts");
const usersIdRoute = read("app/api/v1/rh/users/[id]/route.ts");
const sectorsRoute = read("app/api/v1/rh/sectors/route.ts");
const sectorsIdRoute = read("app/api/v1/rh/sectors/[id]/route.ts");
const rhPg = read("lib/rh/pg.ts");
const employesActions = read("app/espace-praticien/admin/employes/actions.ts");
const praticiensActions = read(
  "app/espace-praticien/admin/praticiens/actions.ts",
);

check(
  "RH users routes require admin",
  usersRoute.includes('profile.role !== "admin"') &&
    usersIdRoute.includes('profile.role !== "admin"'),
);
check(
  "RH sectors routes require admin",
  sectorsRoute.includes('profile.role !== "admin"') &&
    sectorsIdRoute.includes('profile.role !== "admin"'),
);
check(
  "POST invite omits inviteToken/inviteUrl from JSON",
  !/inviteToken\s*:/.test(usersRoute) &&
    usersRoute.includes("emailSent: emailResult.sent") &&
    usersRoute.includes("Jamais renvoyer inviteToken") &&
    // inviteUrl only for sendInviteEmail server-side, jamais dans le body JSON
    !/emailSent[\s\S]{0,80}inviteUrl/.test(usersRoute),
);
check(
  "PATCH reactivate omits resetToken/inviteUrl from JSON",
  !/resetToken\s*:/.test(usersIdRoute) &&
    usersIdRoute.includes("emailSent: emailResult.sent") &&
    usersIdRoute.includes("Jamais renvoyer resetToken") &&
    !/emailSent[\s\S]{0,80}inviteUrl/.test(usersIdRoute),
);
check(
  "PATCH resend-invite remints without token JSON",
  usersIdRoute.includes('action === "resend-invite"') &&
    rhPg.includes("resendInviteUserPg") &&
    usersIdRoute.includes("Jamais renvoyer inviteToken") &&
    !/emailSent[\s\S]{0,80}inviteUrl/.test(usersIdRoute) &&
    praticiensActions.includes("resendInvite") &&
    praticiensActions.includes("resendInviteUserPg") &&
    !praticiensActions.includes("inviteToken"),
);
check(
  "invite role allowlist (no admin)",
  rhPg.includes("parseInviteRoleStrict") &&
    rhPg.includes("INVITE_ROLES") &&
    /role === "admin"/.test(rhPg),
);
check(
  "soft/permanent/reactivate block admin",
  /softDeleteUserPg[\s\S]*role === "admin"/.test(rhPg) &&
    /permanentlyDeleteUserPg[\s\S]*role === "admin"/.test(rhPg) &&
    /reactivateUserPg[\s\S]*role === "admin"/.test(rhPg),
);
check(
  "FK sector inexistant → invite-sector (pas 500)",
  rhPg.includes("sectorExistsRhPg") &&
    rhPg.includes("isForeignKeyViolation") &&
    /inviteUserPg[\s\S]*invite-sector/.test(rhPg),
);
check(
  "soft-delete already-deleted idempotent (alreadyDeleted)",
  rhPg.includes("alreadyDeleted") &&
    usersIdRoute.includes("alreadyDeleted") &&
    rhPg.includes("Idempotence documentée"),
);
check(
  "leave-balance scoped to lab roles",
  /updateEmployeeLeaveBalancePg[\s\S]*SECTOR_LAB_ROLES/.test(rhPg),
);
check(
  "web actions requireAdmin + same pg helpers",
  employesActions.includes("requireAdmin") &&
    employesActions.includes("updateEmployeeLeaveBalancePg") &&
    praticiensActions.includes("requireAdmin") &&
    praticiensActions.includes("inviteUserPg") &&
    praticiensActions.includes("softDeleteUserPg") &&
    !praticiensActions.includes("inviteToken") &&
    !praticiensActions.includes("resetToken"),
);
check(
  "web invite allowlist rejects non-invite roles",
  praticiensActions.includes('rawRole !== "practitioner"') &&
    praticiensActions.includes('rawRole !== "chef_de_secteur"'),
);
check(
  "isUuid on RH user/sector ids",
  usersIdRoute.includes("isUuid") &&
    sectorsIdRoute.includes("isUuid") &&
    rhPg.includes("isUuid"),
);

// --- Runtime -----------------------------------------------------------------
const sql = postgres(databaseUrl, { max: 1 });
const cleanupEmails = [];

try {
  const adminLogin = await login("admin@local.dev");
  check(
    "admin login",
    adminLogin.status === 200 && Boolean(adminLogin.data?.token),
    `status=${adminLogin.status}`,
  );
  const adminToken = adminLogin.data?.token;
  if (!adminToken) throw new Error("abort: no admin token");

  for (const [label, email] of [
    ["praticien", "praticien@local.dev"],
    ["prothesiste", "prothesiste@local.dev"],
    ["chef", "chef@local.dev"],
  ]) {
    const tok = (await login(email)).data?.token;
    if (!tok) {
      check(`login ${label}`, false, "no token");
      continue;
    }
    for (const path of [
      "/api/v1/rh/users",
      "/api/v1/rh/users?scope=lab",
      "/api/v1/rh/sectors",
    ]) {
      const r = await fetchJson(path, { token: tok });
      check(
        `${label} GET ${path} → 403`,
        r.status === 403 && r.data?.error === "forbidden",
        `status=${r.status}`,
      );
    }
    const postUser = await fetchJson("/api/v1/rh/users", {
      method: "POST",
      token: tok,
      body: {
        email: `deny-${label}-${stamp}@local.dev`,
        role: "practitioner",
      },
    });
    check(
      `${label} POST /rh/users → 403`,
      postUser.status === 403,
      `status=${postUser.status}`,
    );
    const postSector = await fetchJson("/api/v1/rh/sectors", {
      method: "POST",
      token: tok,
      body: { name: `Deny ${label} ${stamp}`, color: "#111111" },
    });
    check(
      `${label} POST /rh/sectors → 403`,
      postSector.status === 403,
      `status=${postSector.status}`,
    );
  }

  // Invite matrix
  const inviteEmail = `smoke-s11-${stamp}@local.dev`;
  cleanupEmails.push(inviteEmail);
  const invited = await fetchJson("/api/v1/rh/users", {
    method: "POST",
    token: adminToken,
    body: {
      email: inviteEmail,
      fullName: "Smoke S11",
      role: "practitioner",
    },
  });
  check(
    "admin invite practitioner → 201",
    invited.status === 201 && Boolean(invited.data?.id),
    `status=${invited.status}`,
  );
  check(
    "invite response has no cleartext tokens",
    !responseHasSecret(invited.data),
    JSON.stringify(invited.data),
  );
  const userId = invited.data?.id;

  const adminInvite = await fetchJson("/api/v1/rh/users", {
    method: "POST",
    token: adminToken,
    body: {
      email: `smoke-s11-admin-${stamp}@local.dev`,
      role: "admin",
    },
  });
  check(
    "invite role=admin → 400 invite-validation",
    adminInvite.status === 400 &&
      adminInvite.data?.error === "invite-validation",
    `status=${adminInvite.status} ${adminInvite.data?.error}`,
  );

  const labNoSector = await fetchJson("/api/v1/rh/users", {
    method: "POST",
    token: adminToken,
    body: {
      email: `smoke-s11-lab-${stamp}@local.dev`,
      role: "prosthetist",
    },
  });
  check(
    "invite prosthetist sans sector → 400",
    labNoSector.status === 400 && labNoSector.data?.error === "invite-sector",
    `status=${labNoSector.status}`,
  );

  const missingSector = await fetchJson("/api/v1/rh/users", {
    method: "POST",
    token: adminToken,
    body: {
      email: `smoke-s11-fk-${stamp}@local.dev`,
      role: "prosthetist",
      sectorId: "00000000-0000-4000-8000-000000000099",
    },
  });
  check(
    "invite FK sector inexistant → 400 invite-sector",
    missingSector.status === 400 &&
      missingSector.data?.error === "invite-sector",
    `status=${missingSector.status} ${missingSector.data?.error}`,
  );

  const labOkEmail = `smoke-s11-lab-ok-${stamp}@local.dev`;
  cleanupEmails.push(labOkEmail);
  const labOk = await fetchJson("/api/v1/rh/users", {
    method: "POST",
    token: adminToken,
    body: {
      email: labOkEmail,
      role: "prosthetist",
      sectorId: SECTOR_A,
    },
  });
  check(
    "invite prosthetist + sector → 201",
    labOk.status === 201 && Boolean(labOk.data?.id),
    `status=${labOk.status}`,
  );
  check(
    "lab invite response has no tokens",
    !responseHasSecret(labOk.data),
    JSON.stringify(labOk.data),
  );
  const labUserId = labOk.data?.id;

  // Resend invite (re-mint + email, zéro token JSON)
  if (userId) {
    const hashBefore = await sql`
      select invite_token_hash from public.users where id = ${userId}::uuid
    `;
    const resent = await fetchJson(`/api/v1/rh/users/${userId}`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "resend-invite" },
    });
    check(
      "resend-invite pending → 200",
      resent.status === 200 && resent.data?.ok === true,
      `status=${resent.status} ${JSON.stringify(resent.data)}`,
    );
    check(
      "resend-invite response has no cleartext tokens",
      !responseHasSecret(resent.data),
      JSON.stringify(resent.data),
    );
    check(
      "resend-invite exposes emailSent (not URL)",
      typeof resent.data?.emailSent === "boolean" &&
        !("inviteUrl" in (resent.data ?? {})),
    );
    const hashAfter = await sql`
      select invite_token_hash from public.users where id = ${userId}::uuid
    `;
    check(
      "resend-invite reminted hash",
      Boolean(hashAfter[0]?.invite_token_hash) &&
        hashAfter[0]?.invite_token_hash !== hashBefore[0]?.invite_token_hash,
    );

    const pracTok = (await login("praticien@local.dev")).data?.token;
    if (pracTok) {
      const denied = await fetchJson(`/api/v1/rh/users/${userId}`, {
        method: "PATCH",
        token: pracTok,
        body: { action: "resend-invite" },
      });
      check(
        "praticien resend-invite → 403",
        denied.status === 403,
        `status=${denied.status}`,
      );
    }
  }

  // Soft-delete admin blocked
  const delAdmin = await fetchJson(`/api/v1/rh/users/${ID_ADMIN}`, {
    method: "PATCH",
    token: adminToken,
    body: { action: "soft-delete" },
  });
  check(
    "soft-delete admin → 400 delete-validation",
    delAdmin.status === 400 && delAdmin.data?.error === "delete-validation",
    `status=${delAdmin.status}`,
  );

  const permAdmin = await fetchJson(`/api/v1/rh/users/${ID_ADMIN}`, {
    method: "DELETE",
    token: adminToken,
  });
  check(
    "permanent-delete admin → 400",
    permAdmin.status === 400 &&
      permAdmin.data?.error === "delete-validation",
    `status=${permAdmin.status}`,
  );

  // leave-balance: lab OK, practitioner refuse
  if (labUserId) {
    const balOk = await fetchJson(`/api/v1/rh/users/${labUserId}`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "leave-balance", leaveBalanceDays: 9 },
    });
    check(
      "leave-balance lab → 200",
      balOk.status === 200 && balOk.data?.ok === true,
      `status=${balOk.status}`,
    );
  }
  if (userId) {
    const balPrac = await fetchJson(`/api/v1/rh/users/${userId}`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "leave-balance", leaveBalanceDays: 3 },
    });
    check(
      "leave-balance practitioner → 400",
      balPrac.status === 400,
      `status=${balPrac.status} ${balPrac.data?.error}`,
    );
  }

  // Invalid UUID → 400 (pas 500)
  const badId = await fetchJson("/api/v1/rh/users/not-a-uuid", {
    method: "PATCH",
    token: adminToken,
    body: { action: "soft-delete" },
  });
  check(
    "invalid user id → 400",
    badId.status === 400,
    `status=${badId.status}`,
  );

  // Soft-delete + reactivate without leaking resetToken
  if (userId) {
    const inviteToken = await overwriteInviteToken(sql, userId);
    const setPw = await fetchJson("/api/v1/auth/set-password", {
      method: "POST",
      body: {
        token: inviteToken,
        password: "ImplantolabS11ok1!",
        confirm: "ImplantolabS11ok1!",
      },
    });
    check(
      "set-password via DB-minted invite token",
      setPw.status === 200,
      `status=${setPw.status}`,
    );

    const resendAfterSet = await fetchJson(`/api/v1/rh/users/${userId}`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "resend-invite" },
    });
    check(
      "resend-invite after set-password → 400 invite-not-pending",
      resendAfterSet.status === 400 &&
        resendAfterSet.data?.error === "invite-not-pending",
      `status=${resendAfterSet.status} ${resendAfterSet.data?.error}`,
    );

    const soft = await fetchJson(`/api/v1/rh/users/${userId}`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "soft-delete" },
    });
    check(
      "soft-delete practitioner → 200",
      soft.status === 200 &&
        soft.data?.ok === true &&
        soft.data?.alreadyDeleted === false,
      `status=${soft.status} alreadyDeleted=${soft.data?.alreadyDeleted}`,
    );

    const softAgain = await fetchJson(`/api/v1/rh/users/${userId}`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "soft-delete" },
    });
    check(
      "soft-delete déjà-deleted → 200 alreadyDeleted",
      softAgain.status === 200 &&
        softAgain.data?.ok === true &&
        softAgain.data?.alreadyDeleted === true,
      `status=${softAgain.status} alreadyDeleted=${softAgain.data?.alreadyDeleted}`,
    );

    const reactivated = await fetchJson(`/api/v1/rh/users/${userId}`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "reactivate" },
    });
    check(
      "reactivate → 200",
      reactivated.status === 200 && reactivated.data?.ok === true,
      `status=${reactivated.status}`,
    );
    check(
      "reactivate response has no cleartext tokens",
      !responseHasSecret(reactivated.data),
      JSON.stringify(reactivated.data),
    );

    // Confirmer qu’un reset token existe côté DB (hash) sans le renvoyer
    const rows = await sql`
      select password_reset_token_hash is not null as has_reset
        from public.users
       where id = ${userId}::uuid
    `;
    check(
      "reactivate stored reset hash server-side",
      rows[0]?.has_reset === true,
    );

    // Overwrite for cleanup login path optional — soft-delete then permanent
    await overwriteResetToken(sql, userId);
    const soft2 = await fetchJson(`/api/v1/rh/users/${userId}`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "soft-delete" },
    });
    check("soft-delete before permanent", soft2.status === 200);

    const gone = await fetchJson(`/api/v1/rh/users/${userId}`, {
      method: "DELETE",
      token: adminToken,
    });
    check(
      "permanent delete → 200",
      gone.status === 200 && gone.data?.ok === true,
      `status=${gone.status}`,
    );
  }

  // Cleanup lab invitee
  if (labUserId) {
    await fetchJson(`/api/v1/rh/users/${labUserId}`, {
      method: "PATCH",
      token: adminToken,
      body: { action: "soft-delete" },
    });
    await fetchJson(`/api/v1/rh/users/${labUserId}`, {
      method: "DELETE",
      token: adminToken,
    });
  }
} catch (err) {
  failed += 1;
  console.error(`FAIL runtime — ${err.message}`);
} finally {
  try {
    if (cleanupEmails.length > 0) {
      await sql`
        delete from public.users
         where email = any(${cleanupEmails})
      `;
    }
    await sql`
      delete from public.users
       where email like ${`smoke-s11-%${stamp}@local.dev`}
    `;
  } catch {
    // ignore cleanup
  }
  await sql.end({ timeout: 5 });
}

if (failed > 0) {
  console.error(`\nS11 smoke: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\nS11 smoke: all good");
