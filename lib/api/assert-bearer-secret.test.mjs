import assert from "node:assert/strict";
import test from "node:test";

const ORIG = {
  CRON_SECRET: process.env.CRON_SECRET,
  PUSH_WEBHOOK_SECRET: process.env.PUSH_WEBHOOK_SECRET,
  DATA_BACKEND: process.env.DATA_BACKEND,
};

const LONG_SECRET = "correct-secret-value-at-least-32ch";
const SHORT_SECRET = "too-short";

test.afterEach(() => {
  if (ORIG.CRON_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIG.CRON_SECRET;
  if (ORIG.PUSH_WEBHOOK_SECRET === undefined) {
    delete process.env.PUSH_WEBHOOK_SECRET;
  } else {
    process.env.PUSH_WEBHOOK_SECRET = ORIG.PUSH_WEBHOOK_SECRET;
  }
  if (ORIG.DATA_BACKEND === undefined) delete process.env.DATA_BACKEND;
  else process.env.DATA_BACKEND = ORIG.DATA_BACKEND;
});

const { assertBearerSecret, MIN_BEARER_SECRET_LENGTH } = await import(
  "./assert-bearer-secret.ts"
);

function req(auth) {
  return new Request("http://local/cron", {
    headers: auth ? { authorization: auth } : {},
  });
}

test("fail-closed when secret env missing → 500 generic (no env name)", async () => {
  delete process.env.CRON_SECRET;
  const res = assertBearerSecret(req("Bearer anything"), "CRON_SECRET");
  assert.ok(res);
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error, "Configuration serveur manquante");
  assert.doesNotMatch(body.error, /CRON_SECRET/);
});

test("postgres: short secret → 500 generic", async () => {
  process.env.DATA_BACKEND = "postgres";
  process.env.CRON_SECRET = SHORT_SECRET;
  assert.ok(SHORT_SECRET.length < MIN_BEARER_SECRET_LENGTH);
  const res = assertBearerSecret(req(`Bearer ${SHORT_SECRET}`), "CRON_SECRET");
  assert.ok(res);
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error, "Configuration serveur manquante");
  assert.doesNotMatch(JSON.stringify(body), /CRON_SECRET/);
});

test("supabase: short secret still accepted (prod path intact)", () => {
  process.env.DATA_BACKEND = "supabase";
  process.env.CRON_SECRET = SHORT_SECRET;
  assert.equal(
    assertBearerSecret(req(`Bearer ${SHORT_SECRET}`), "CRON_SECRET"),
    null,
  );
});

test("missing / malformed Authorization → 401", () => {
  process.env.CRON_SECRET = LONG_SECRET;
  for (const auth of [undefined, "", "Basic x", "Bearer"]) {
    const res = assertBearerSecret(req(auth), "CRON_SECRET");
    assert.ok(res, `expected 401 for ${JSON.stringify(auth)}`);
    assert.equal(res.status, 401);
  }
});

test("Bearer scheme case-insensitive (RFC 6750)", () => {
  process.env.CRON_SECRET = LONG_SECRET;
  for (const scheme of ["Bearer", "bearer", "BEARER", "BeArEr"]) {
    assert.equal(
      assertBearerSecret(req(`${scheme} ${LONG_SECRET}`), "CRON_SECRET"),
      null,
      scheme,
    );
  }
});

test("wrong bearer → 401 ; correct → null", () => {
  process.env.CRON_SECRET = LONG_SECRET;
  const bad = assertBearerSecret(req("Bearer wrong"), "CRON_SECRET");
  assert.ok(bad);
  assert.equal(bad.status, 401);

  const ok = assertBearerSecret(
    req(`Bearer ${LONG_SECRET}`),
    "CRON_SECRET",
  );
  assert.equal(ok, null);
});

test("PUSH_WEBHOOK_SECRET uses same helper", () => {
  process.env.PUSH_WEBHOOK_SECRET = LONG_SECRET;
  assert.equal(
    assertBearerSecret(req(`Bearer ${LONG_SECRET}`), "PUSH_WEBHOOK_SECRET"),
    null,
  );
  const bad = assertBearerSecret(req("Bearer other"), "PUSH_WEBHOOK_SECRET");
  assert.equal(bad?.status, 401);
});
