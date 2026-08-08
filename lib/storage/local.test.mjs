import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const tmpRoot = mkdtempSync(join(tmpdir(), "il-storage-"));
process.env.LOCAL_STORAGE_ROOT = tmpRoot;

const {
  resolveStoragePath,
  putObject,
  getObject,
  deleteObject,
  StoragePathError,
} = await import("./local.ts");

test.after(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

test("resolveStoragePath stays under LOCAL_STORAGE_ROOT", () => {
  const full = resolveStoragePath(
    "request-media",
    "requests/abc/photo.jpg",
  );
  assert.ok(full.startsWith(tmpRoot));
  assert.ok(full.includes(`${join("request-media", "requests", "abc")}`));
});

test("rejects path traversal and absolute paths", () => {
  const bad = [
    "../outside.txt",
    "foo/../../outside.txt",
    "....//....//etc/passwd",
    "/etc/passwd",
    "C:\\Windows\\win.ini",
    "\\\\server\\share\\file",
    "requests/../secret",
    "",
    ".",
  ];
  for (const path of bad) {
    assert.throws(
      () => resolveStoragePath("request-media", path),
      StoragePathError,
      `should reject ${JSON.stringify(path)}`,
    );
  }
});

test("rejects invalid bucket names", () => {
  assert.throws(
    () => resolveStoragePath("../evil", "requests/x/a.jpg"),
    StoragePathError,
  );
  assert.throws(
    () => resolveStoragePath("request media", "requests/x/a.jpg"),
    StoragePathError,
  );
});

test("put/get/delete round-trip + deleteObject fails closed on poison path", async () => {
  const path = "requests/demo/photo.jpg";
  await putObject("request-media", path, Buffer.from("hello"));
  const got = await getObject("request-media", path);
  assert.equal(got?.toString(), "hello");

  await deleteObject("request-media", path);
  assert.equal(await getObject("request-media", path), null);

  await assert.rejects(
    () => deleteObject("request-media", "../escape.txt"),
    StoragePathError,
  );
});

test("getObject returns null for escape instead of reading outside root", async () => {
  const outside = join(tmpRoot, "..", "outside-secret.txt");
  writeFileSync(outside, "secret");
  mkdirSync(join(tmpRoot, "request-media"), { recursive: true });
  assert.equal(await getObject("request-media", "../outside-secret.txt"), null);
});

test("rejects symlink leaf (fail-closed, no escape via link)", async () => {
  const outside = join(tmpRoot, "..", `outside-il-symlink-${Date.now()}.txt`);
  writeFileSync(outside, "secret-via-symlink");
  const dir = join(tmpRoot, "request-media", "requests", "sym");
  mkdirSync(dir, { recursive: true });
  const linkPath = join(dir, "photo.jpg");
  try {
    symlinkSync(outside, linkPath);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    // Windows sans privilège symlink — skip plutôt que FAIL flaky.
    if (code === "EPERM" || code === "EACCES" || code === "ENOTSUP") {
      console.log("skip symlink leaf test —", code);
      return;
    }
    throw error;
  }

  assert.equal(
    await getObject("request-media", "requests/sym/photo.jpg"),
    null,
    "getObject must not follow symlink",
  );
  await assert.rejects(
    () =>
      putObject(
        "request-media",
        "requests/sym/photo.jpg",
        Buffer.from("overwrite"),
      ),
    StoragePathError,
  );
  await assert.rejects(
    () => deleteObject("request-media", "requests/sym/photo.jpg"),
    StoragePathError,
  );
});

test("rejects symlink directory under bucket (fail-closed)", async () => {
  const outsideDir = join(tmpRoot, "..", `outside-il-dir-${Date.now()}`);
  mkdirSync(outsideDir, { recursive: true });
  writeFileSync(join(outsideDir, "leak.jpg"), "leaked");
  const parent = join(tmpRoot, "request-media", "requests");
  mkdirSync(parent, { recursive: true });
  const linkDir = join(parent, "evil-link");
  try {
    symlinkSync(outsideDir, linkDir, "dir");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code === "EPERM" || code === "EACCES" || code === "ENOTSUP") {
      console.log("skip symlink dir test —", code);
      return;
    }
    throw error;
  }

  assert.equal(
    await getObject("request-media", "requests/evil-link/leak.jpg"),
    null,
  );
  await assert.rejects(
    () =>
      putObject(
        "request-media",
        "requests/evil-link/new.jpg",
        Buffer.from("x"),
      ),
    StoragePathError,
  );
});
