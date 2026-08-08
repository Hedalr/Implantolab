const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const PASS = "ImplantolabDev1!";
const SUBJECT = "Modifications prothèse";
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

const protheseSubjects = encodeURIComponent(SUBJECT);
const labSubjects = encodeURIComponent("Infos complémentaires");

console.log(`Smoke M4 against ${BASE}\n`);

const admin = await login("admin@local.dev");
if (!admin?.token) process.exit(1);

const prac = await login("praticien@local.dev");
if (!prac?.token) process.exit(1);

const sectors = (
  await api("/api/v1/sectors", { token: admin.token })
).data?.sectors;
const sectorId = sectors?.[0]?.id;
ok("sector available", Boolean(sectorId), sectorId || "none");
if (!sectorId) process.exit(1);

let requestId = null;
{
  const created = await api("/api/v1/requests", {
    method: "POST",
    token: prac.token,
    body: {
      subject: SUBJECT,
      message: "Smoke test M4 — modification prothèse dual-mode.",
      patientName: "Patient Smoke M4",
      sectorId,
    },
  });
  ok(
    "POST Modifications prothèse (praticien)",
    created.status === 201 && Boolean(created.data?.id),
    `HTTP ${created.status} ${JSON.stringify(created.data)}`,
  );
  requestId = created.data?.id;
}

if (!requestId) process.exit(1);

{
  const list = await api(
    `/api/v1/requests?subjects=${protheseSubjects}&limit=200`,
    { token: admin.token },
  );
  ok(
    "GET /requests Modifs (admin)",
    list.status === 200 && Array.isArray(list.data?.requests),
    `n=${list.data?.requests?.length ?? "?"}`,
  );
  const found = (list.data?.requests ?? []).some((r) => r.id === requestId);
  ok("admin list contains new Modif", found, requestId);
  const onlyProthese = (list.data?.requests ?? []).every(
    (r) => r.subject === SUBJECT,
  );
  ok("admin subjects filter Modifs only", onlyProthese);
}

{
  const detail = await api(`/api/v1/requests/${requestId}`, {
    token: admin.token,
  });
  ok(
    "GET /requests/:id admin",
    detail.status === 200 && detail.data?.request?.id === requestId,
    `subject=${detail.data?.request?.subject}`,
  );
  ok(
    "detail subject is Modifs",
    detail.data?.request?.subject === SUBJECT,
    detail.data?.request?.subject,
  );

  const media = await api(`/api/v1/requests/${requestId}/media`, {
    token: admin.token,
  });
  ok(
    "GET /requests/:id/media",
    media.status === 200 && Array.isArray(media.data?.media),
    `n=${media.data?.media?.length ?? "?"}`,
  );
}

{
  const labList = await api(
    `/api/v1/requests?subjects=${labSubjects}&limit=200`,
    { token: admin.token },
  );
  const leaked = (labList.data?.requests ?? []).some((r) => r.id === requestId);
  ok("Modif absent du filtre Labo", !leaked);
}

{
  const close = await api(`/api/v1/requests/${requestId}`, {
    method: "PATCH",
    token: admin.token,
    body: { status: "closed" },
  });
  ok(
    "PATCH closed (admin)",
    close.status === 200 && close.data?.status === "closed",
    JSON.stringify(close.data),
  );

  const d1 = await api(`/api/v1/requests/${requestId}`, {
    token: admin.token,
  });
  ok(
    "status persisted closed",
    d1.data?.request?.status === "closed",
    d1.data?.request?.status,
  );

  const open = await api(`/api/v1/requests/${requestId}`, {
    method: "PATCH",
    token: admin.token,
    body: { status: "open" },
  });
  ok(
    "PATCH open (admin)",
    open.status === 200 && open.data?.status === "open",
    JSON.stringify(open.data),
  );
}

{
  const patch = await api(`/api/v1/requests/${requestId}`, {
    method: "PATCH",
    token: prac.token,
    body: { status: "closed" },
  });
  ok(
    "PATCH forbidden for praticien",
    patch.status === 403,
    `HTTP ${patch.status}`,
  );
}

// Web page path: same SQL filters as listLabRequestsPg / updateLabRequestStatusPg
{
  const postgres = (await import("postgres")).default;
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const rows = await sql`
      select id::text, subject, status, patient_name
        from public.requests
       where subject = ${SUBJECT}
         and id = ${requestId}::uuid
       limit 1
    `;
    ok(
      "SQL row visible (web list filter)",
      rows[0]?.id === requestId && rows[0]?.subject === SUBJECT,
      rows[0]?.patient_name ?? "missing",
    );

    const closed = await sql`
      update public.requests
         set status = 'closed'
       where id = ${requestId}::uuid
         and subject = ${SUBJECT}
      returning id::text, status
    `;
    ok(
      "SQL status update closed (web action)",
      closed[0]?.status === "closed",
      closed[0]?.status,
    );

    await sql`
      update public.requests
         set status = 'open'
       where id = ${requestId}::uuid
         and subject = ${SUBJECT}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

console.log(
  "\nNote: email notify runs async after POST (Resend or warn in Next logs).",
);
console.log(`Done. exitCode=${process.exitCode ?? 0}`);
