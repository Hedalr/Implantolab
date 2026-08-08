/**
 * Smoke S8 — médias + storage local (IDOR, MIME, path escape, disposition).
 * Prérequis : DATA_BACKEND=postgres, Docker DB, `npm run dev`.
 *
 * Usage: node scripts/smoke-s8-media.mjs
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

async function fetchJson(path, { method = "GET", token, body, form } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 60_000);
  try {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) {
      payload = form;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: payload,
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
    return { status: res.status, data, headers: res.headers, raw: text };
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

function tinyJpeg() {
  // Minimal JPEG (SOI + APP0-ish + EOI) — signature ff d8 ff suffices for detector.
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
}

// --- Source guards -----------------------------------------------------------
const localSrc = read("lib/storage/local.ts");
const mediaV1Src = read("app/api/v1/media/[id]/route.ts");
const uploadSrc = read("app/api/v1/requests/[id]/media/route.ts");
const cookieSrc = read("app/api/request-media/[id]/route.ts");
const secSrc = read("lib/requests/media-security.ts");
const accessMediaSrc = read("lib/requests/request-media-access.ts");
const purgeSrc = read("lib/requests/purge-request-media-pg.ts");

check(
  "resolveStoragePath fail-closed (StoragePathError + prefix check)",
  localSrc.includes("class StoragePathError") &&
    localSrc.includes("path_escape") &&
    localSrc.includes("isInsideRoot") &&
    !localSrc.includes(".replace(/\\.\\./g"),
);
check(
  "deleteObject ne swallow pas StoragePathError",
  localSrc.includes("resolveStoragePath(bucket, path)") &&
    localSrc.includes('code === "ENOENT"'),
);
check(
  "GET /api/v1/media : isUuid + canAccess + isReadableLocalMedia",
  mediaV1Src.includes("isUuid") &&
    mediaV1Src.includes("canAccessRequest") &&
    mediaV1Src.includes("isReadableLocalMedia") &&
    mediaV1Src.includes("mediaContentHeaders"),
);
check(
  "GET /api/v1/media anti-enum 403 (inconnu = forbidden)",
  mediaV1Src.includes('error: "forbidden"') &&
    mediaV1Src.includes("!media || !(await canAccessRequest"),
);
check(
  "Upload : owner practitioner + isUuid + detectPhotoMimeType",
  uploadSrc.includes('profile.role !== "practitioner"') &&
    uploadSrc.includes("ownerRows[0].id !== profile.id") &&
    uploadSrc.includes("isUuid(id)") &&
    uploadSrc.includes("detectPhotoMimeType"),
);
check(
  "Upload : plafond photos ≤6 (aligné web)",
  uploadSrc.includes("MAX_REQUEST_PHOTOS") &&
    uploadSrc.includes("too_many_photos") &&
    uploadSrc.includes("count(*)"),
);
check(
  "Cookie route postgres : canAccess + isReadableLocalMedia + headers",
  cookieSrc.includes("isPostgresBackend") &&
    cookieSrc.includes("canAccessRequest") &&
    cookieSrc.includes("isReadableLocalMedia") &&
    cookieSrc.includes("mediaContentHeaders"),
);
check(
  "mediaContentHeaders : nosniff + disposition",
  secSrc.includes("X-Content-Type-Options") &&
    secSrc.includes("Content-Disposition") &&
    secSrc.includes("sanitizeDownloadFilename"),
);
check(
  "isReadableLocalMedia = bucket request-media + path attendu",
  accessMediaSrc.includes("isReadableLocalMedia") &&
    accessMediaSrc.includes("REQUEST_MEDIA_BUCKET") &&
    accessMediaSrc.includes("isExpectedStoragePath"),
);
check(
  "purge PG passe par deleteObject (confinement storage)",
  purgeSrc.includes("deleteObject(row.bucket, row.path)"),
);
check(
  "list media GET n’expose pas storage_path / storage_bucket",
  uploadSrc.includes("Ne pas exposer storage_bucket / storage_path") &&
    !/return json\(\{\s*media: media\.map\(\(row\) => \(\{\s*\.\.\.row/m.test(
      uploadSrc,
    ) &&
    uploadSrc.includes("url: `/api/v1/media/${row.id}`") &&
    !uploadSrc.includes(
      "select id, request_id, storage_bucket, storage_path, mime_type",
    ),
);
check(
  "storage local refuse symlinks (fail-closed)",
  localSrc.includes("assertNoSymlinksAlongPath") &&
    localSrc.includes("symlink_rejected") &&
    localSrc.includes("isSymbolicLink"),
);

console.log(`\nSmoke S8 against ${baseUrl}\n`);

const sql = postgres(databaseUrl, { max: 1 });
const stamp = Date.now();
const pracBId = randomUUID();
const pracBEmail = `smoke-s8-prac-${stamp}@local.dev`;
const createdIds = [];
const mediaIds = [];

try {
  const hash = await bcrypt.hash(PASS, 10);
  await sql`
    insert into public.users (id, email, password_hash, email_confirmed_at)
    values (${pracBId}::uuid, ${pracBEmail}, ${hash}, now())
  `;
  await sql`
    update public.profiles
       set role = 'practitioner',
           full_name = 'Smoke S8 Praticien B',
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

  const pracAId = pracA.data.profile.id;
  await sql`alter table public.requests disable trigger requests_rate_limit`;

  const requestA = randomUUID();
  await sql`
    insert into public.requests (
      id, subject, message, patient_name, sector_id, profile_id, created_by, status
    ) values (
      ${requestA}::uuid,
      'Question',
      'Smoke S8 — demande praticien A.',
      'Patient S8 A',
      ${SECTOR_PRO}::uuid,
      ${pracAId}::uuid,
      ${pracAId}::uuid,
      'open'
    )
  `;
  createdIds.push(requestA);

  const requestB = randomUUID();
  await sql`
    insert into public.requests (
      id, subject, message, patient_name, sector_id, profile_id, created_by, status
    ) values (
      ${requestB}::uuid,
      'Question',
      'Smoke S8 — demande praticien B (IDOR).',
      'Patient S8 B',
      ${SECTOR_PRO}::uuid,
      ${pracBId}::uuid,
      ${pracBId}::uuid,
      'open'
    )
  `;
  createdIds.push(requestB);

  const requestChefSector = randomUUID();
  await sql`
    insert into public.requests (
      id, subject, message, patient_name, sector_id, profile_id, created_by, status
    ) values (
      ${requestChefSector}::uuid,
      'Question',
      'Smoke S8 — secteur chef (lab hors scope).',
      'Patient S8 Chef',
      ${SECTOR_CHEF}::uuid,
      ${pracAId}::uuid,
      ${pracAId}::uuid,
      'open'
    )
  `;
  createdIds.push(requestChefSector);

  await sql`alter table public.requests enable trigger requests_rate_limit`;

  // --- upload owner OK -------------------------------------------------------
  const formOk = new FormData();
  formOk.append(
    "file",
    new Blob([tinyJpeg()], { type: "image/jpeg" }),
    'photo"\r\ninject.jpg',
  );
  const upOk = await fetchJson(`/api/v1/requests/${requestA}/media`, {
    method: "POST",
    token: pracA.data.token,
    form: formOk,
  });
  check(
    "upload owner → 201",
    upOk.status === 201 && Boolean(upOk.data?.id),
    `HTTP ${upOk.status} ${JSON.stringify(upOk.data)}`,
  );
  const mediaId = upOk.data?.id;
  if (mediaId) mediaIds.push(mediaId);

  // --- upload non-owner / non-praticien --------------------------------------
  const formB = new FormData();
  formB.append("file", new Blob([tinyJpeg()], { type: "image/jpeg" }), "x.jpg");
  const upIdor = await fetchJson(`/api/v1/requests/${requestA}/media`, {
    method: "POST",
    token: pracB.data.token,
    form: formB,
  });
  check(
    "upload non-owner → 403",
    upIdor.status === 403 && upIdor.data?.error === "forbidden",
    `HTTP ${upIdor.status}`,
  );

  const formLab = new FormData();
  formLab.append(
    "file",
    new Blob([tinyJpeg()], { type: "image/jpeg" }),
    "x.jpg",
  );
  const upLab = await fetchJson(`/api/v1/requests/${requestA}/media`, {
    method: "POST",
    token: lab.data.token,
    form: formLab,
  });
  check(
    "upload lab → 403",
    upLab.status === 403 && upLab.data?.error === "forbidden",
    `HTTP ${upLab.status}`,
  );

  // --- fichier non-image -----------------------------------------------------
  const formTxt = new FormData();
  formTxt.append(
    "file",
    new Blob([Buffer.from("<script>alert(1)</script>")], {
      type: "image/jpeg",
    }),
    "evil.jpg",
  );
  const upTxt = await fetchJson(`/api/v1/requests/${requestA}/media`, {
    method: "POST",
    token: pracA.data.token,
    form: formTxt,
  });
  check(
    "fichier non-image (MIME spoof) → 400 invalid_mime",
    upTxt.status === 400 && upTxt.data?.error === "invalid_mime",
    `HTTP ${upTxt.status}`,
  );

  // --- plafond 6 photos (aligné web) — après MIME pour ne pas masquer invalid_mime
  const padIds = [];
  for (let i = 0; i < 5; i++) {
    const id = randomUUID();
    const path = `requests/${requestA}/${id}.jpg`;
    await sql`
      insert into public.request_media (
        id, request_id, storage_bucket, storage_path, mime_type, size_bytes, original_filename
      )
      values (
        ${id}::uuid,
        ${requestA}::uuid,
        'request-media',
        ${path},
        'image/jpeg',
        12,
        ${`pad-${i}.jpg`}
      )
    `;
    padIds.push(id);
    mediaIds.push(id);
  }
  const formCap = new FormData();
  formCap.append(
    "file",
    new Blob([tinyJpeg()], { type: "image/jpeg" }),
    "over.jpg",
  );
  const upCap = await fetchJson(`/api/v1/requests/${requestA}/media`, {
    method: "POST",
    token: pracA.data.token,
    form: formCap,
  });
  check(
    "upload 7e photo → 400 too_many_photos",
    upCap.status === 400 && upCap.data?.error === "too_many_photos",
    `HTTP ${upCap.status} ${JSON.stringify(upCap.data)}`,
  );
  // Retirer les pads pour ne pas perturber list/download suivants (reste 1 media réel).
  if (padIds.length > 0) {
    await sql`delete from public.request_media where id = any(${padIds}::uuid[])`;
    for (const id of padIds) {
      const idx = mediaIds.indexOf(id);
      if (idx >= 0) mediaIds.splice(idx, 1);
    }
  }

  // --- download IDOR ---------------------------------------------------------
  if (!mediaId) throw new Error("abort: no media id");

  const dlOwner = await fetchJson(`/api/v1/media/${mediaId}`, {
    token: pracA.data.token,
  });
  check(
    "download owner → 200 image",
    dlOwner.status === 200 &&
      dlOwner.headers.get("content-type")?.startsWith("image/") &&
      dlOwner.headers.get("x-content-type-options") === "nosniff" &&
      (dlOwner.headers.get("content-disposition") ?? "").includes("inline"),
    `HTTP ${dlOwner.status} ct=${dlOwner.headers.get("content-type")}`,
  );

  const dlIdor = await fetchJson(`/api/v1/media/${mediaId}`, {
    token: pracB.data.token,
  });
  check(
    "download media hors accès (praticien B) → 403",
    dlIdor.status === 403 && dlIdor.data?.error === "forbidden",
    `HTTP ${dlIdor.status}`,
  );

  const dlLabOk = await fetchJson(`/api/v1/media/${mediaId}`, {
    token: lab.data.token,
  });
  check(
    "download lab même secteur → 200",
    dlLabOk.status === 200,
    `HTTP ${dlLabOk.status}`,
  );

  // Media sur demande hors secteur lab
  const formChef = new FormData();
  formChef.append(
    "file",
    new Blob([tinyJpeg()], { type: "image/jpeg" }),
    "chef.jpg",
  );
  const upChef = await fetchJson(
    `/api/v1/requests/${requestChefSector}/media`,
    {
      method: "POST",
      token: pracA.data.token,
      form: formChef,
    },
  );
  check(
    "upload media secteur chef → 201",
    upChef.status === 201 && Boolean(upChef.data?.id),
    `HTTP ${upChef.status}`,
  );
  const mediaChef = upChef.data?.id;
  if (mediaChef) mediaIds.push(mediaChef);

  if (mediaChef) {
    const labCross = await fetchJson(`/api/v1/media/${mediaChef}`, {
      token: lab.data.token,
    });
    check(
      "download lab hors secteur → 403",
      labCross.status === 403 && labCross.data?.error === "forbidden",
      `HTTP ${labCross.status}`,
    );
  }

  // --- anti-enum / UUID invalide ---------------------------------------------
  const badId = await fetchJson("/api/v1/media/not-a-uuid", {
    token: pracA.data.token,
  });
  check(
    "download UUID invalide → 403",
    badId.status === 403 && badId.data?.error === "forbidden",
    `HTTP ${badId.status}`,
  );

  const missing = await fetchJson(
    "/api/v1/media/00000000-0000-4000-8000-000000000099",
    { token: pracA.data.token },
  );
  check(
    "download UUID inexistant → 403 (anti-enum)",
    missing.status === 403 && missing.data?.error === "forbidden",
    `HTTP ${missing.status}`,
  );

  // --- disposition download=1 ------------------------------------------------
  const dlAttach = await fetchJson(`/api/v1/media/${mediaId}?download=1`, {
    token: pracA.data.token,
  });
  const disp = dlAttach.headers.get("content-disposition") ?? "";
  check(
    "disposition download=1 → attachment + filename sanitisé",
    dlAttach.status === 200 &&
      disp.startsWith("attachment;") &&
      !disp.includes("\r") &&
      !disp.includes("\n") &&
      !disp.includes('photo"'),
    `disp=${disp}`,
  );

  // --- list IDOR -------------------------------------------------------------
  const listIdor = await fetchJson(`/api/v1/requests/${requestA}/media`, {
    token: pracB.data.token,
  });
  check(
    "list media hors accès → 403",
    listIdor.status === 403 && listIdor.data?.error === "forbidden",
    `HTTP ${listIdor.status}`,
  );

  const listOk = await fetchJson(`/api/v1/requests/${requestA}/media`, {
    token: pracA.data.token,
  });
  const listItems = Array.isArray(listOk.data?.media) ? listOk.data.media : [];
  const listLeaksStorage = listItems.some(
    (row) =>
      row &&
      (Object.prototype.hasOwnProperty.call(row, "storage_path") ||
        Object.prototype.hasOwnProperty.call(row, "storage_bucket")),
  );
  check(
    "list media owner → 200",
    listOk.status === 200 && listItems.length >= 1,
    `HTTP ${listOk.status} n=${listItems.length}`,
  );
  check(
    "list media sans storage_path / storage_bucket",
    listOk.status === 200 && !listLeaksStorage && listItems[0]?.url,
    listLeaksStorage
      ? `leaked keys in ${JSON.stringify(listItems[0])}`
      : `url=${listItems[0]?.url ?? "?"}`,
  );

  // --- path escape unit (import storage) -------------------------------------
  process.env.LOCAL_STORAGE_ROOT = join(root, ".data", "storage-smoke-s8");
  const { resolveStoragePath, StoragePathError } = await import(
    "../lib/storage/local.ts"
  );
  let escapeRejected = true;
  for (const p of ["../secret", "foo/../../x", "/etc/passwd", "C:\\Windows\\a"]) {
    try {
      resolveStoragePath("request-media", p);
      escapeRejected = false;
      break;
    } catch (e) {
      if (!(e instanceof StoragePathError)) escapeRejected = false;
    }
  }
  check("path `../` / absolu rejetés par resolveStoragePath", escapeRejected);

  // Symlink fail-closed (skip si OS refuse la création de symlink)
  const { mkdirSync, writeFileSync, symlinkSync, rmSync } = await import(
    "node:fs"
  );
  const { tmpdir } = await import("node:os");
  const smokeRoot = join(root, ".data", "storage-smoke-s8");
  const outside = join(tmpdir(), `smoke-s8-outside-${Date.now()}.txt`);
  writeFileSync(outside, "secret");
  const symDir = join(smokeRoot, "request-media", "requests", "symsmoke");
  mkdirSync(symDir, { recursive: true });
  const linkPath = join(symDir, "photo.jpg");
  let symlinkOk = false;
  try {
    symlinkSync(outside, linkPath);
    symlinkOk = true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    console.log(`SKIP symlink runtime check — cannot create symlink (${code})`);
  }
  if (symlinkOk) {
    const { getObject, putObject, StoragePathError: SPE } = await import(
      "../lib/storage/local.ts"
    );
    const got = await getObject("request-media", "requests/symsmoke/photo.jpg");
    check("getObject via symlink → null (fail-closed)", got === null);
    let putRejected = false;
    try {
      await putObject(
        "request-media",
        "requests/symsmoke/photo.jpg",
        Buffer.from("x"),
      );
    } catch (e) {
      putRejected = e instanceof SPE;
    }
    check("putObject via symlink → StoragePathError", putRejected);
    try {
      rmSync(linkPath, { force: true });
      rmSync(outside, { force: true });
    } catch {
      // cleanup best-effort
    }
  }

  // Cookie route sans session → 401
  const cookieUnauth = await fetchJson(`/api/request-media/${mediaId}`);
  check(
    "cookie route sans session → 401",
    cookieUnauth.status === 401,
    `HTTP ${cookieUnauth.status}`,
  );
} catch (error) {
  failed += 1;
  console.error("FAIL abort —", error);
} finally {
  try {
    if (mediaIds.length > 0) {
      await sql`delete from public.request_media where id = any(${mediaIds}::uuid[])`;
    }
    if (createdIds.length > 0) {
      await sql`delete from public.requests where id = any(${createdIds}::uuid[])`;
    }
    await sql`delete from public.users where id = ${pracBId}::uuid`;
  } catch (cleanupErr) {
    console.error("cleanup error", cleanupErr);
  }
  await sql.end({ timeout: 5 });
}

console.log("");
if (failed > 0) {
  console.error(`Smoke S8 FAILED (${failed} check(s))`);
  process.exit(1);
}
console.log("Smoke S8 OK — all good");
