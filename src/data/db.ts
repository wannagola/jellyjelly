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

/** 씨앗 목록이 바뀔 때마다 올린다 */
const SEED_VERSION = 2;

/**
 * 브랜드가 이름 앞에 붙어 있든 말든 같은 젤리로 본다.
 * ("하리보"/"하리보 골드베렌" 과 "하리보"/"골드베렌" 은 같은 것)
 */
function identity(brand: string | undefined, name: string): string {
  const b = (brand ?? "").replace(/\s+/g, "");
  let n = name.replace(/\s+/g, "");
  if (b && n.startsWith(b)) n = n.slice(b.length);
  return `${b}|${n}`;
}

/**
 * 도감 씨앗을 채운다. 첫 실행이든 앱 업데이트든 **빠진 것만** 넣는다.
 * 이미 있는 젤리는 건드리지 않는다 - 모양이나 사진을 고쳐뒀다면 그게 이긴다.
 * 지운 젤리도 다시 살리지 않는다.
 */
export async function syncSeed(): Promise<void> {
  const stored = (await db.meta.get("seedVersion"))?.value;
  if (stored === SEED_VERSION) return;

  const existing = await db.jellies.toArray();
  const known = new Set<string>();
  for (const jelly of existing) {
    if (jelly.seedKey) known.add(jelly.seedKey);
    known.add(identity(jelly.brand, jelly.name));
  }

  const missing = SEED_JELLIES.filter(
    (s) => !known.has(s.seedKey) && !known.has(identity(s.brand, s.name)),
  );

  const now = Date.now();
  await db.transaction("rw", db.jellies, db.meta, async () => {
    if (missing.length > 0) {
      await db.jellies.bulkAdd(
        missing.map((j) => ({ ...j, id: newId(), createdAt: now, updatedAt: now })),
      );
    }
    await db.meta.put({ key: "seedVersion", value: SEED_VERSION });
    await db.meta.delete("seeded"); // v1이 쓰던 플래그
  });
}

/** 설정값 한 칸. 없으면 undefined. */
export async function readSetting<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function writeSetting(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
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

/** 최애 표시를 켜고 끈다 */
export async function toggleFavorite(id: string): Promise<void> {
  const jelly = await db.jellies.get(id);
  if (!jelly) return;
  await db.jellies.update(id, { favorite: !jelly.favorite, updatedAt: Date.now() });
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
  await db.transaction("rw", db.entries, db.jellies, async () => {
    const entry = await db.entries.get(id);
    await db.entries.update(id, { ...review, status: "done", finishedAt: now, updatedAt: now });

    // 그날 찍은 사진이 있는데 젤리엔 아직 대표 사진이 없으면 그걸 얼굴로 쓴다.
    // 따로 물어볼 만한 일이 아니다. 이미 있으면 건드리지 않는다.
    if (!review?.photo || !entry) return;
    const jelly = await db.jellies.get(entry.jellyId);
    if (jelly && !jelly.photo) {
      await db.jellies.update(jelly.id, { photo: review.photo, updatedAt: now });
    }
  });
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id);
}
