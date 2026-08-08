const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const PASS = "ImplantolabDev1!";

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

const labSubjects = encodeURIComponent("Infos complémentaires");

console.log(`Smoke M2 against ${BASE}\n`);

const admin = await login("admin@local.dev");
if (!admin?.token) process.exit(1);

{
  const me = await api("/api/v1/me", { token: admin.token });
  ok(
    "GET /me admin",
    me.status === 200 && me.data?.profile?.role === "admin",
    me.data?.profile?.role,
  );
}

let sectors = [];
{
  const sec = await api("/api/v1/sectors", { token: admin.token });
  sectors = sec.data?.sectors ?? [];
  ok(
    "GET /sectors",
    sec.status === 200 && sectors.length >= 1,
    `count=${sectors.length}`,
  );
}

const prac = await login("praticien@local.dev");
if (!prac?.token) process.exit(1);

let requestId = null;
{
  const list = await api(
    `/api/v1/requests?subjects=${labSubjects}&limit=200`,
    { token: admin.token },
  );
  ok(
    "GET /requests lab subjects (admin)",
    list.status === 200 && Array.isArray(list.data?.requests),
    `HTTP ${list.status} n=${list.data?.requests?.length ?? "?"}`,
  );
  if (list.data?.requests?.length) {
    requestId = list.data.requests[0].id;
    console.log("     using existing lab request", requestId);
  }
}

if (!requestId) {
  const sectorId = sectors[0]?.id;
  ok("sector available for create", Boolean(sectorId), sectorId || "none");
  const created = await api("/api/v1/requests", {
    method: "POST",
    token: prac.token,
    body: {
      subject: "Infos complémentaires",
      message: "Smoke test M2 labo mobile — détail et statut.",
      patientName: "Patient Smoke M2",
      sectorId,
    },
  });
  ok(
    "POST /requests Infos complémentaires",
    created.status === 201 && Boolean(created.data?.id),
    `HTTP ${created.status} ${JSON.stringify(created.data)}`,
  );
  requestId = created.data?.id;
}

if (!requestId) {
  console.log("ABORT: no request id");
  process.exit(1);
}

{
  const d = await api(`/api/v1/requests/${requestId}`, { token: admin.token });
  ok(
    "GET /requests/:id admin",
    d.status === 200 && d.data?.request?.id === requestId,
    `subject=${d.data?.request?.subject}`,
  );
  ok(
    "detail is lab subject",
    d.data?.request?.subject === "Infos complémentaires",
    d.data?.request?.subject,
  );
}

{
  const m = await api(`/api/v1/requests/${requestId}/media`, {
    token: admin.token,
  });
  ok(
    "GET /requests/:id/media",
    m.status === 200 && Array.isArray(m.data?.media),
    `n=${m.data?.media?.length ?? "?"}`,
  );
}

{
  const sectorId = sectors[0]?.id;
  const filtered = await api(
    `/api/v1/requests?subjects=${labSubjects}&sectorId=${sectorId}&limit=200`,
    { token: admin.token },
  );
  ok(
    "GET /requests admin sectorId filter",
    filtered.status === 200,
    `n=${filtered.data?.requests?.length ?? "?"}`,
  );
  const allSame = (filtered.data?.requests ?? []).every(
    (r) => r.sector_id === sectorId,
  );
  ok(
    "admin sector filter applies",
    allSame || (filtered.data?.requests?.length ?? 0) === 0,
    allSame ? "all match" : "mismatch",
  );
}

{
  const close = await api(`/api/v1/requests/${requestId}`, {
    method: "PATCH",
    token: admin.token,
    body: { status: "closed" },
  });
  ok(
    "PATCH status closed (admin)",
    close.status === 200 && close.data?.status === "closed",
    JSON.stringify(close.data),
  );
  const d1 = await api(`/api/v1/requests/${requestId}`, { token: admin.token });
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
    "PATCH status open (admin)",
    open.status === 200 && open.data?.status === "open",
    JSON.stringify(open.data),
  );
}

const chef = await login("chef@local.dev");
if (chef?.token) {
  const chefSector = chef.profile?.sectorId;
  ok("chef has sectorId", Boolean(chefSector), chefSector || "none");

  // Ensure at least one lab request on chef sector for happy path.
  let chefRequestId = requestId;
  {
    const reqSector = (
      await api(`/api/v1/requests/${requestId}`, { token: admin.token })
    ).data?.request?.sector_id;
    if (reqSector !== chefSector && chefSector) {
      const created = await api("/api/v1/requests", {
        method: "POST",
        token: prac.token,
        body: {
          subject: "Infos complémentaires",
          message: "Smoke test M2 — demande secteur chef.",
          patientName: "Patient Chef M2",
          sectorId: chefSector,
        },
      });
      ok(
        "POST lab request on chef sector",
        created.status === 201 && Boolean(created.data?.id),
        `HTTP ${created.status}`,
      );
      chefRequestId = created.data?.id ?? chefRequestId;
    }
  }

  const list = await api(
    `/api/v1/requests?subjects=${labSubjects}&limit=200`,
    { token: chef.token },
  );
  ok(
    "GET /requests lab (chef)",
    list.status === 200 && (list.data?.requests?.length ?? 0) >= 1,
    `n=${list.data?.requests?.length ?? "?"}`,
  );
  const scoped = (list.data?.requests ?? []).every(
    (r) => r.sector_id === chefSector,
  );
  ok("chef list scoped to sector", scoped, `sector=${chefSector}`);

  const detail = await api(`/api/v1/requests/${chefRequestId}`, {
    token: chef.token,
  });
  ok(
    "GET detail (chef same sector)",
    detail.status === 200,
    `HTTP ${detail.status}`,
  );
  const patch = await api(`/api/v1/requests/${chefRequestId}`, {
    method: "PATCH",
    token: chef.token,
    body: { status: "closed" },
  });
  ok("PATCH status (chef)", patch.status === 200, JSON.stringify(patch.data));
  await api(`/api/v1/requests/${chefRequestId}`, {
    method: "PATCH",
    token: chef.token,
    body: { status: "open" },
  });

  // Cross-sector: if original request is another sector, must be forbidden.
  if (chefRequestId !== requestId) {
    const forbidden = await api(`/api/v1/requests/${requestId}`, {
      token: chef.token,
    });
    ok(
      "GET detail (chef other sector) forbidden",
      forbidden.status === 403 || forbidden.status === 404,
      `HTTP ${forbidden.status}`,
    );
  }
}

const pro = await login("prothesiste@local.dev");
if (pro?.token) {
  const list = await api(
    `/api/v1/requests?subjects=${labSubjects}&limit=200`,
    { token: pro.token },
  );
  ok(
    "GET /requests lab (prothesiste)",
    list.status === 200,
    `n=${list.data?.requests?.length ?? "?"}`,
  );
  const proSector = pro.profile?.sectorId;
  ok("prothesiste has sectorId", Boolean(proSector), proSector || "none");
  const scoped = (list.data?.requests ?? []).every(
    (r) => r.sector_id === proSector,
  );
  ok("prothesiste list scoped to sector", scoped, `sector=${proSector}`);

  const detail = await api(`/api/v1/requests/${requestId}`, {
    token: pro.token,
  });
  const reqSector = (
    await api(`/api/v1/requests/${requestId}`, { token: admin.token })
  ).data?.request?.sector_id;
  if (reqSector === proSector) {
    ok("GET detail (pro same sector)", detail.status === 200, `HTTP ${detail.status}`);
    const patch = await api(`/api/v1/requests/${requestId}`, {
      method: "PATCH",
      token: pro.token,
      body: { status: "closed" },
    });
    ok(
      "PATCH status (prothesiste)",
      patch.status === 200,
      JSON.stringify(patch.data),
    );
    await api(`/api/v1/requests/${requestId}`, {
      method: "PATCH",
      token: pro.token,
      body: { status: "open" },
    });
  } else {
    ok(
      "GET detail (pro other sector) forbidden",
      detail.status === 403 || detail.status === 404,
      `HTTP ${detail.status} reqSector=${reqSector}`,
    );
  }
}

{
  const patch = await api(`/api/v1/requests/${requestId}`, {
    method: "PATCH",
    token: prac.token,
    body: { status: "closed" },
  });
  ok("PATCH forbidden for praticien", patch.status === 403, `HTTP ${patch.status}`);
}

{
  const out = await api("/api/v1/auth/logout", {
    method: "POST",
    token: admin.token,
  });
  ok("logout admin", out.status === 200 || out.status === 204, `HTTP ${out.status}`);
  const me = await api("/api/v1/me", { token: admin.token });
  ok("me after logout is 401", me.status === 401, `HTTP ${me.status}`);
}

console.log(`\nDone. exitCode=${process.exitCode ?? 0}`);
