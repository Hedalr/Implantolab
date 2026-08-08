import "server-only";

import { getSql } from "@/lib/db/client";
import { deleteObject, StoragePathError } from "@/lib/storage/local";

/** Purge file d’attente storage pour le backend postgres / fichiers locaux. */
export async function purgeRequestMediaStoragePg(): Promise<{
  processed: number;
  errors: number;
}> {
  const sql = getSql();
  const pending = await sql<
    { id: number; bucket: string; path: string }[]
  >`
    select id, bucket, path
      from public.storage_purge_queue
     where processed_at is null
     order by created_at asc
     limit 100
  `;

  let processed = 0;
  let errors = 0;

  for (const row of pending) {
    try {
      // Confinement via resolveStoragePath (S8) — poison path → StoragePathError.
      await deleteObject(row.bucket, row.path);
      await sql`
        update public.storage_purge_queue
           set processed_at = now(), error = null
         where id = ${row.id}
      `;
      processed += 1;
    } catch (error) {
      errors += 1;
      const message = error instanceof Error ? error.message : String(error);
      // Path/bucket invalides : échec permanent (sinon DoS file = 100 slots bloqués).
      // Erreurs FS transitoires : retry (processed_at reste null).
      if (error instanceof StoragePathError) {
        await sql`
          update public.storage_purge_queue
             set processed_at = now(), error = ${message}
           where id = ${row.id}
        `;
      } else {
        await sql`
          update public.storage_purge_queue
             set error = ${message}
           where id = ${row.id}
        `;
      }
    }
  }

  return { processed, errors };
}
