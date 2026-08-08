import { lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const DEFAULT_ROOT = resolve(process.cwd(), ".data", "storage");

export class StoragePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoragePathError";
  }
}

export function getStorageRoot(): string {
  return resolve(process.env.LOCAL_STORAGE_ROOT ?? DEFAULT_ROOT);
}

function isInsideRoot(root: string, candidate: string): boolean {
  const rootResolved = resolve(root);
  const candidateResolved = resolve(candidate);
  const prefix = rootResolved.endsWith(sep)
    ? rootResolved
    : rootResolved + sep;
  return (
    candidateResolved === rootResolved ||
    candidateResolved.startsWith(prefix)
  );
}

/**
 * Fail-closed : refuse tout symlink le long du chemin sous LOCAL_STORAGE_ROOT.
 * Empêche lecture/écriture via un lien planté qui s’échappe du root.
 */
async function assertNoSymlinksAlongPath(fullPath: string): Promise<void> {
  const root = getStorageRoot();
  if (!isInsideRoot(root, fullPath)) {
    throw new StoragePathError("path_escape");
  }

  const rel = relative(root, fullPath);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) {
    throw new StoragePathError("path_escape");
  }

  const parts = rel.split(sep).filter((part) => part.length > 0);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    let st;
    try {
      st = await lstat(current);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      // Chemin inexistant (put d’un nouvel objet) — OK tant que les parents
      // déjà présents ne sont pas des symlinks (vérifiés ci-dessus).
      if (code === "ENOENT") return;
      throw error;
    }
    if (st.isSymbolicLink()) {
      throw new StoragePathError("symlink_rejected");
    }
  }
}

/**
 * Résout un chemin sous LOCAL_STORAGE_ROOT.
 * Fail-closed : rejet abs/UNC/drive, segments `..`, null bytes, escape.
 * Les I/O (put/get/delete) refusent aussi les symlinks (voir assertNoSymlinksAlongPath).
 */
export function resolveStoragePath(bucket: string, path: string): string {
  if (typeof bucket !== "string" || typeof path !== "string") {
    throw new StoragePathError("invalid_storage_path");
  }
  if (bucket.includes("\0") || path.includes("\0")) {
    throw new StoragePathError("invalid_storage_path");
  }

  const safeBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeBucket || safeBucket !== bucket) {
    throw new StoragePathError("invalid_storage_bucket");
  }

  // Absolu POSIX / UNC / drive Windows — jamais via join/resolve aveugle.
  if (
    path.startsWith("/") ||
    path.startsWith("\\") ||
    /^[a-zA-Z]:/.test(path)
  ) {
    throw new StoragePathError("invalid_storage_path");
  }

  const parts = path
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part.length > 0 && part !== ".");
  // Rejet `..` et variantes (`....`) — confinement via resolve+prefix ensuite.
  if (
    parts.length === 0 ||
    parts.some((part) => part === ".." || part.includes(".."))
  ) {
    throw new StoragePathError("invalid_storage_path");
  }

  const root = getStorageRoot();
  const fullPath = resolve(root, safeBucket, ...parts);
  const bucketRoot = resolve(root, safeBucket);

  if (!isInsideRoot(root, fullPath) || !isInsideRoot(bucketRoot, fullPath)) {
    throw new StoragePathError("path_escape");
  }

  return fullPath;
}

export async function putObject(
  bucket: string,
  path: string,
  data: Buffer,
): Promise<void> {
  const fullPath = resolveStoragePath(bucket, path);
  await assertNoSymlinksAlongPath(fullPath);
  await mkdir(dirname(fullPath), { recursive: true });
  // Re-check after mkdir : un concurrent pourrait planter un symlink.
  await assertNoSymlinksAlongPath(fullPath);
  await writeFile(fullPath, data);
}

export async function getObject(
  bucket: string,
  path: string,
): Promise<Buffer | null> {
  try {
    const fullPath = resolveStoragePath(bucket, path);
    await assertNoSymlinksAlongPath(fullPath);
    return await readFile(fullPath);
  } catch (error) {
    if (error instanceof StoragePathError) return null;
    return null;
  }
}

export async function deleteObject(
  bucket: string,
  path: string,
): Promise<void> {
  // Validation hors try : poison path / symlink ne doivent pas être
  // traités comme "déjà parti".
  const fullPath = resolveStoragePath(bucket, path);
  await assertNoSymlinksAlongPath(fullPath);
  try {
    await unlink(fullPath);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "ENOENT") return;
    throw error;
  }
}
