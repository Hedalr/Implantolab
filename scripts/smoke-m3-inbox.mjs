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

const inboxSubjects = encodeURIComponent("Question,Urgence");

console.log(`Smoke M3 against ${BASE}\n`);

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

let questionId = null;
{
  const created = await api("/api/v1/requests", {
    method: "POST",
    token: prac.token,
    body: {
      subject: "Question",
      message: "Smoke test M3 — question admin inbox.",
      patientName: "Patient Smoke M3",
      sectorId,
    },
  });
  ok(
    "POST Question (praticien)",
    created.status === 201 && Boolean(created.data?.id),
    `HTTP ${created.status} ${JSON.stringify(created.data)}`,
  );
  questionId = created.data?.id;
}

if (!questionId) process.exit(1);

{
  const list = await api(
    `/api/v1/requests?subjects=${inboxSubjects}&limit=200`,
    { token: admin.token },
  );
  ok(
    "GET /requests Q/Urgence (admin)",
    list.status === 200 && Array.isArray(list.data?.requests),
    `n=${list.data?.requests?.length ?? "?"}`,
  );
  const found = (list.data?.requests ?? []).some((r) => r.id === questionId);
  ok("admin list contains new Question", found, questionId);
  const onlyInbox = (list.data?.requests ?? []).every(
    (r) => r.subject === "Question" || r.subject === "Urgence",
  );
  ok("admin subjects filter Q/Urgence only", onlyInbox);
}

{
  const close = await api(`/api/v1/requests/${questionId}`, {
    method: "PATCH",
    token: admin.token,
    body: { status: "closed" },
  });
  ok(
    "PATCH closed (admin)",
    close.status === 200 && close.data?.status === "closed",
    JSON.stringify(close.data),
  );

  const open = await api(`/api/v1/requests/${questionId}`, {
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
  const msg = await api(`/api/v1/requests/${questionId}/messages`, {
    method: "POST",
    token: admin.token,
    body: { body: "Réponse smoke M3 admin." },
  });
  ok(
    "POST message (admin)",
    msg.status === 201 || msg.status === 200,
    `HTTP ${msg.status}`,
  );

  const thread = await api(`/api/v1/requests/${questionId}/messages`, {
    token: prac.token,
  });
  ok(
    "GET messages (praticien)",
    thread.status === 200 && (thread.data?.messages?.length ?? 0) >= 1,
    `n=${thread.data?.messages?.length ?? "?"}`,
  );
}

const chef = await login("chef@local.dev");
if (chef?.token) {
  const chefSector = chef.profile?.sectorId;
  ok("chef has sectorId", Boolean(chefSector), chefSector || "none");

  let chefQuestionId = questionId;
  {
    const reqSector = (
      await api(`/api/v1/requests/${questionId}`, { token: admin.token })
    ).data?.request?.sector_id;
    if (reqSector !== chefSector && chefSector) {
      const created = await api("/api/v1/requests", {
        method: "POST",
        token: prac.token,
        body: {
          subject: "Urgence",
          message: "Smoke test M3 — urgence secteur chef.",
          patientName: "Patient Chef M3",
          sectorId: chefSector,
        },
      });
      ok(
        "POST Urgence on chef sector",
        created.status === 201 && Boolean(created.data?.id),
        `HTTP ${created.status}`,
      );
      chefQuestionId = created.data?.id ?? chefQuestionId;
    }
  }

  const list = await api(
    `/api/v1/requests?subjects=${inboxSubjects}&limit=200`,
    { token: chef.token },
  );
  ok(
    "GET /requests Q/Urgence (chef)",
    list.status === 200,
    `n=${list.data?.requests?.length ?? "?"}`,
  );
  const scoped = (list.data?.requests ?? []).every(
    (r) => r.sector_id === chefSector,
  );
  ok("chef list scoped to sector", scoped, `sector=${chefSector}`);
  const onlyInbox = (list.data?.requests ?? []).every(
    (r) => r.subject === "Question" || r.subject === "Urgence",
  );
  ok("chef subjects filter Q/Urgence only", onlyInbox);

  const patch = await api(`/api/v1/requests/${chefQuestionId}`, {
    method: "PATCH",
    token: chef.token,
    body: { status: "closed" },
  });
  ok("PATCH status (chef)", patch.status === 200, JSON.stringify(patch.data));
  await api(`/api/v1/requests/${chefQuestionId}`, {
    method: "PATCH",
    token: chef.token,
    body: { status: "open" },
  });
}

console.log("\nDone.");
