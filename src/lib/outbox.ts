// Offline queue for expense writes. Inserts use client generated ids, so replays are idempotent.
import { supabase } from "./supabase/client";
import { readCache, writeCache } from "./cache";
import type { Expense } from "./types";

type Op =
  | { kind: "upsert"; row: Omit<Expense, "pending"> }
  | { kind: "delete"; id: string };

const KEY = "outbox";
let flushing = false;

export function pending(): Op[] {
  return readCache<Op[]>(KEY) ?? [];
}

export function enqueue(op: Op) {
  const id = op.kind === "upsert" ? op.row.id : op.id;
  // newest op for a row wins; a delete for a never-synced row is a harmless no-op on the server
  writeCache(KEY, [...pending().filter((o) => (o.kind === "upsert" ? o.row.id : o.id) !== id), op]);
}

/** Push queued ops in order. Stops at the first network failure and keeps the rest. */
export async function flush(): Promise<boolean> {
  if (flushing) return false;
  flushing = true;
  try {
    let ops = pending();
    while (ops.length) {
      const op = ops[0];
      const q =
        op.kind === "upsert"
          ? supabase().from("expenses").upsert(op.row)
          : supabase().from("expenses").delete().eq("id", op.id);
      const { error } = await q;
      // a network failure surfaces as an error with no code; keep it queued
      if (error && !error.code) return false;
      const done = JSON.stringify(op);
      ops = pending().filter((o) => JSON.stringify(o) !== done);
      writeCache(KEY, ops);
    }
    return true;
  } catch {
    return false;
  } finally {
    flushing = false;
  }
}
