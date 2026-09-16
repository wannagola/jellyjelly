import Dexie, { type EntityTable } from "dexie";
import { newId } from "../lib/id";
import { SEED_JELLIES } from "./seed";
import type { Entry, Jelly } from "./types";

class JellyDB extends Dexie {
  jellies!: EntityTable<Jelly, "id">;
  entries!: EntityTable<Entry, "id">;
  meta!: EntityTable<{ key: string; value: unknown }, "key">;

  constructor() {
    super("jellyjelly");
    this.version(1).stores({
      jellies: "id, name, updatedAt",
      entries: "id, jellyId, status, finishedAt, updatedAt",
      meta: "key",
    });
  }
}

export const db = new JellyDB();

/** 첫 실행에만 도감 씨앗을 깐다. 두 번째부터는 아무것도 하지 않는다. */
export async function seedOnce(): Promise<void> {
  const done = await db.meta.get("seeded");
  if (done) return;

  const now = Date.now();
  await db.transaction("rw", db.jellies, db.meta, async () => {
    await db.jellies.bulkAdd(
      SEED_JELLIES.map((j) => ({ ...j, id: newId(), createdAt: now, updatedAt: now })),
    );
    await db.meta.put({ key: "seeded", value: now });
  });
}

export async function addJelly(
  input: Omit<Jelly, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = Date.now();
  const id = newId();
  await db.jellies.add({ ...input, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateJelly(id: string, patch: Partial<Jelly>): Promise<void> {
  await db.jellies.update(id, { ...patch, updatedAt: Date.now() });
}

/** 먹기 시작. 같은 젤리를 또 먹어도 기록은 새로 하나 생긴다. */
export async function startEating(jellyId: string): Promise<string> {
  const now = Date.now();
  const id = newId();
  await db.entries.add({
    id,
    jellyId,
    status: "eating",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function finishEntry(id: string, review?: Partial<Entry>): Promise<void> {
  const now = Date.now();
  await db.entries.update(id, {
    ...review,
    status: "done",
    finishedAt: now,
    updatedAt: now,
  });
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id);
}
