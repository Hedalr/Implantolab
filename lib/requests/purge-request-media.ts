import "server-only";

import { getServiceRoleSupabase } from "@/lib/supabase/admin";
import { REQUEST_MEDIA_BUCKET } from "@/lib/requests/request-media-access";

type PurgeItem = {
  id?: number;
  bucket: string;
  path: string;
};

export type PurgeRequestMediaResult = {
  queued: number;
  orphansEnqueued: number;
  removed: number;
  failed: number;
  errors: string[];
};

const REMOVE_BATCH = 100;

/**
 * Traite la file `storage_purge_queue` + les orphelins Storage via l’API
 * Storage (seul chemin autorisé par Supabase pour supprimer des objets).
 */
export async function purgeRequestMediaStorage(): Promise<PurgeRequestMediaResult> {
  const admin = getServiceRoleSupabase();
  const errors: string[] = [];
  let orphansEnqueued = 0;
  let removed = 0;
  let failed = 0;

  // 1. Backfill orphelins → file
  const { data: orphans, error: orphanError } = await admin.rpc(
    "list_orphan_request_media_paths",
  );

  if (orphanError) {
    errors.push(`list_orphan_request_media_paths: ${orphanError.message}`);
  } else if (orphans?.length) {
    const rows = (orphans as { bucket: string; path: string }[]).map((o) => ({
      bucket: o.bucket || REQUEST_MEDIA_BUCKET,
      path: o.path,
    }));

    const { error: insertError } = await admin
      .from("storage_purge_queue")
      .insert(rows);

    if (insertError) {
      // Doublons possibles si le cron chevauche : on ignore et on lit la file.
      if (!/duplicate|unique/i.test(insertError.message)) {
        errors.push(`enqueue orphans: ${insertError.message}`);
      }
    } else {
      orphansEnqueued = rows.length;
    }
  }

  // 2. Lire la file en attente
  const { data: pending, error: pendingError } = await admin
    .from("storage_purge_queue")
    .select("id, bucket, path")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(500);

  if (pendingError) {
    errors.push(`read queue: ${pendingError.message}`);
    return {
      queued: 0,
      orphansEnqueued,
      removed: 0,
      failed: 0,
      errors,
    };
  }

  const items = (pending ?? []) as PurgeItem[];
  if (items.length === 0) {
    return {
      queued: 0,
      orphansEnqueued,
      removed: 0,
      failed: 0,
      errors,
    };
  }

  // 3. Grouper par bucket et supprimer par lots via l’API Storage
  const byBucket = new Map<string, PurgeItem[]>();
  for (const item of items) {
    const bucket = item.bucket || REQUEST_MEDIA_BUCKET;
    const list = byBucket.get(bucket) ?? [];
    list.push(item);
    byBucket.set(bucket, list);
  }

  for (const [bucket, bucketItems] of byBucket) {
    for (let i = 0; i < bucketItems.length; i += REMOVE_BATCH) {
      const batch = bucketItems.slice(i, i + REMOVE_BATCH);
      const paths = [...new Set(batch.map((b) => b.path))];

      const { error: removeError } = await admin.storage
        .from(bucket)
        .remove(paths);

      const now = new Date().toISOString();
      const ids = batch
        .map((b) => b.id)
        .filter((id): id is number => typeof id === "number");

      if (removeError) {
        failed += batch.length;
        errors.push(`storage.remove(${bucket}): ${removeError.message}`);
        if (ids.length) {
          await admin
            .from("storage_purge_queue")
            .update({ error: removeError.message })
            .in("id", ids);
        }
        continue;
      }

      removed += paths.length;
      if (ids.length) {
        await admin
          .from("storage_purge_queue")
          .update({ processed_at: now, error: null })
          .in("id", ids);
      }
    }
  }

  return {
    queued: items.length,
    orphansEnqueued,
    removed,
    failed,
    errors,
  };
}
