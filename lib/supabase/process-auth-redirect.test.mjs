import assert from "node:assert/strict";
import test from "node:test";
import {
  getSafeAuthTarget,
  processAuthRedirect,
} from "./process-auth-redirect.ts";

test("auth targets stay inside the practitioner space", () => {
  assert.equal(
    getSafeAuthTarget("/espace-praticien/admin?view=open"),
    "/espace-praticien/admin?view=open",
  );
  assert.equal(getSafeAuthTarget("//evil.example"), "/espace-praticien/set-password");
  assert.equal(getSafeAuthTarget("/\\evil.example"), "/espace-praticien/set-password");
  assert.equal(
    getSafeAuthTarget("/espace-praticien.evil.example"),
    "/espace-praticien/set-password",
  );
  assert.equal(
    getSafeAuthTarget("https://evil.example/espace-praticien"),
    "/espace-praticien/set-password",
  );
});

test("fragment session tokens are rejected", async () => {
  const client = {
    auth: {
      exchangeCodeForSession: async () => {
        throw new Error("unexpected code exchange");
      },
      verifyOtp: async () => {
        throw new Error("unexpected OTP verification");
      },
      setSession: async () => {
        throw new Error("fragment tokens must never be installed");
      },
    },
  };

  const result = await processAuthRedirect(
    client,
    "https://implantolab.fr/espace-praticien/auth/callback#access_token=a&refresh_token=b",
  );

  assert.deepEqual(result, { ok: false, reason: "missing" });
});

test("valid invite token hashes are verified without a pre-emptive sign-out", async () => {
  let verified = false;
  const client = {
    auth: {
      exchangeCodeForSession: async () => ({ error: null }),
      verifyOtp: async ({ token_hash, type }) => {
        verified = token_hash === "one-time-token" && type === "invite";
        return { error: null };
      },
      signOut: async () => {
        throw new Error("callback must not sign out before verification");
      },
    },
  };

  const result = await processAuthRedirect(
    client,
    "https://implantolab.fr/espace-praticien/auth/callback?token_hash=one-time-token&type=invite&next=//evil.example",
  );

  assert.equal(verified, true);
  assert.deepEqual(result, {
    ok: true,
    target: "/espace-praticien/set-password",
  });
});
