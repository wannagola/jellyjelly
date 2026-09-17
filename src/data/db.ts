import Dexie, { type EntityTable } from "dexie";
import { newId } from "../lib/id";
import { SEED_JELLIES } from "./seed";
import type { Entry, Jelly, Tombstone } from "./types";

class JellyDB extends Dexie {
  jellies!: EntityTable<Jelly, "id">;
  entries!: EntityTable<Entry, "id">;
  meta!: EntityTable<{ key: string; value: unknown }, "key">;
  graveyard!: EntityTable<Tombstone, "id">;

  constructor() {
    super("jellyjelly");
    this.version(1).stores({
      jellies: "id, name, updatedAt",
      entries: "id, jellyId, status, finishedAt, updatedAt",
      meta: "key",
    });
    // 동기화를 위해 '아직 못 올린 것'과 '지운 것'을 찾을 수 있어야 한다
    this.version(2).stores({
      jellies: "id, name, updatedAt, dirty",
      entries: "id, jellyId, status, finishedAt, updatedAt, dirty",
      meta: "key",
      graveyard: "id, kind, dirty",
    });
  }
}

export const db = new JellyDB();

/** 씨앗 목록이 바뀔 때마다 올린다 */
const SEED_VERSION = 3;

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

  const [existing, buried] = await Promise.all([db.jellies.toArray(), db.graveyard.toArray()]);
  const known = new Set<string>();
  for (const jelly of existing) {
    if (jelly.seedKey) known.add(jelly.seedKey);
    known.add(identity(jelly.brand, jelly.name));
  }
  // 손수 지운 젤리는 업데이트해도 되살리지 않는다
  for (const grave of buried) {
    known.add(grave.id);
    if (grave.mark) for (const mark of grave.mark) known.add(mark);
  }

  const missing = SEED_JELLIES.filter(
    (s) => !known.has(s.seedKey) && !known.has(identity(s.brand, s.name)),
  );

  const now = Date.now();
  await db.transaction("rw", db.jellies, db.meta, async () => {
    if (missing.length > 0) {
      await db.jellies.bulkAdd(
        missing.map((j) => ({ ...j, id: newId(), createdAt: now, updatedAt: now, dirty: 1 as const })),
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
  await db.jellies.add({ ...input, id, createdAt: now, updatedAt: now, dirty: 1 });
  return id;
}

export async function updateJelly(id: string, patch: Partial<Jelly>): Promise<void> {
  await db.jellies.update(id, { ...patch, updatedAt: Date.now(), dirty: 1 });
}

/** 최애 표시를 켜고 끈다 */
export async function toggleFavorite(id: string): Promise<void> {
  const jelly = await db.jellies.get(id);
  if (!jelly) return;
  await db.jellies.update(id, { favorite: !jelly.favorite, updatedAt: Date.now(), dirty: 1 });
}

/** 찜하기. 사 먹고 나면 알아서 풀린다 - finishEntry 가 지운다. */
export async function toggleWish(id: string): Promise<void> {
  const jelly = await db.jellies.get(id);
  if (!jelly) return;
  await updateJelly(id, { wish: !jelly.wish });
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
    dirty: 1,
  });
  return id;
}

export async function finishEntry(id: string, review?: Partial<Entry>): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.entries, db.jellies, async () => {
    const entry = await db.entries.get(id);
    await db.entries.update(id, {
      ...review,
      status: "done",
      finishedAt: now,
      updatedAt: now,
      dirty: 1,
    });

    // 찜해둔 걸 먹었으면 찜은 저절로 풀린다. 다 먹고도 목록에 남아 있으면
    // 지우는 게 일이 되고, 안 지우면 목록이 못 믿을 것이 된다.
    if (entry) {
      const wished = await db.jellies.get(entry.jellyId);
      if (wished?.wish) {
        await db.jellies.update(wished.id, { wish: false, updatedAt: now, dirty: 1 });
      }
    }

    // 그날 찍은 사진이 있는데 젤리엔 아직 대표 사진이 없으면 그걸 얼굴로 쓴다.
    // 따로 물어볼 만한 일이 아니다. 이미 있으면 건드리지 않는다.
    if (!review?.photo || !entry) return;
    const jelly = await db.jellies.get(entry.jellyId);
    if (jelly && !jelly.photo) {
      await db.jellies.update(jelly.id, { photo: review.photo, updatedAt: now, dirty: 1 });
    }
  });
}

/** 기록 지우기. 줄은 진짜로 지우고 묘비만 남긴다. */
export async function deleteEntry(id: string): Promise<void> {
  await bury("entry", id, () => db.entries.delete(id));
}

/** 젤리 지우기. 그 젤리의 기록도 같이 묻는다. */
export async function deleteJelly(id: string): Promise<void> {
  const jelly = await db.jellies.get(id);
  const entries = await db.entries.where("jellyId").equals(id).toArray();
  for (const entry of entries) await deleteEntry(entry.id);
  // 무엇을 지웠는지 묘비에 적어 둔다. 줄 id 만으로는 씨앗을 다시 깔 때 못 알아본다.
  const mark = jelly ? [identity(jelly.brand, jelly.name)] : undefined;
  if (jelly?.seedKey) mark?.push(jelly.seedKey);
  await bury("jelly", id, () => db.jellies.delete(id), mark);
}

async function bury(
  kind: Tombstone["kind"],
  id: string,
  remove: () => Promise<unknown>,
  mark?: string[],
) {
  const deletedAt = Date.now();
  await db.transaction("rw", db.jellies, db.entries, db.graveyard, async () => {
    await remove();
    await db.graveyard.put({ id, kind, deletedAt, mark, dirty: 1 });
  });
}
