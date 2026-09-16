import { db, readSetting, writeSetting } from "../data/db";
import type { Entry, Jelly } from "../data/types";
import { PHOTO_BUCKET, supabase } from "./supabase";

/**
 * 기기와 서버를 맞춘다.
 *
 * 기기가 먼저다. 쓰기는 늘 기기에 먼저 들어가고 dirty 표시가 붙는다.
 * 동기화는 그 표시가 붙은 것만 올리고, 서버에서 새로 바뀐 것만 내려받는다.
 * 그래서 인터넷이 없어도 앱은 멀쩡히 돌고, 연결되면 알아서 따라잡는다.
 *
 * 충돌은 updatedAt 이 늦은 쪽이 이긴다. 기기가 하나뿐일 땐 사실상 일어나지 않고,
 * 둘이어도 같은 젤리를 같은 순간에 고치는 일은 드물다.
 */

const PULLED_AT = "syncPulledAt";
/** 첫 동기화에서 사진을 수백 장 받느라 멈춰 있지 않도록 */
const PHOTOS_PER_RUN = 25;

export interface SyncReport {
  pushed: number;
  pulled: number;
  photosUp: number;
  photosDown: number;
  /** 아직 못 내려받은 사진. 다음 번에 마저 가져온다. */
  photosLeft: number;
}

type Row = Record<string, unknown>;

const photoPath = (uid: string, kind: "jelly" | "entry", id: string) =>
  `${uid}/${kind}-${id}.webp`;

/* ---------- 줄 모양 바꾸기 (서버는 snake_case) ---------- */

const jellyToRow = (j: Jelly, uid: string): Row => ({
  id: j.id,
  user_id: uid,
  name: j.name,
  brand: j.brand ?? null,
  shape: j.shape,
  color: j.color,
  kcal: j.kcal ?? null,
  note: j.note ?? null,
  favorite: Boolean(j.favorite),
  seed_key: j.seedKey ?? null,
  photo_path: j.photoPath ?? null,
  created_at: j.createdAt,
  updated_at: j.updatedAt,
  deleted_at: null,
});

const rowToJelly = (r: Row): Omit<Jelly, "photo"> => ({
  id: r.id as string,
  name: r.name as string,
  brand: (r.brand as string) ?? undefined,
  shape: r.shape as Jelly["shape"],
  color: r.color as Jelly["color"],
  kcal: (r.kcal as number) ?? undefined,
  note: (r.note as string) ?? undefined,
  favorite: Boolean(r.favorite),
  seedKey: (r.seed_key as string) ?? undefined,
  photoPath: (r.photo_path as string) ?? undefined,
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
  dirty: 0,
});

const entryToRow = (e: Entry, uid: string): Row => ({
  id: e.id,
  user_id: uid,
  jelly_id: e.jellyId,
  status: e.status,
  started_at: e.startedAt,
  finished_at: e.finishedAt ?? null,
  rating: e.rating ?? null,
  review: e.review ?? null,
  texture: e.texture ?? null,
  photo_path: e.photoPath ?? null,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
  deleted_at: null,
});

const rowToEntry = (r: Row): Omit<Entry, "photo"> => ({
  id: r.id as string,
  jellyId: r.jelly_id as string,
  status: r.status as Entry["status"],
  startedAt: Number(r.started_at),
  finishedAt: r.finished_at === null ? undefined : Number(r.finished_at),
  rating: (r.rating as number) ?? undefined,
  review: (r.review as string) ?? undefined,
  texture: (r.texture as Entry["texture"]) ?? undefined,
  photoPath: (r.photo_path as string) ?? undefined,
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
  dirty: 0,
});

/* ---------- 올리기 ---------- */

async function uploadPhoto(uid: string, kind: "jelly" | "entry", id: string, photo: Blob) {
  const path = photoPath(uid, kind, id);
  const { error } = await supabase!.storage
    .from(PHOTO_BUCKET)
    .upload(path, photo, { contentType: "image/webp", upsert: true });
  if (error) throw error;
  return path;
}

async function push(uid: string): Promise<{ pushed: number; photosUp: number }> {
  const client = supabase!;
  let photosUp = 0;

  const [jellies, entries, graves] = await Promise.all([
    db.jellies.where("dirty").equals(1).toArray(),
    db.entries.where("dirty").equals(1).toArray(),
    db.graveyard.where("dirty").equals(1).toArray(),
  ]);

  // 사진 먼저. 경로가 있어야 줄에 적어 보낼 수 있다.
  for (const jelly of jellies) {
    if (!jelly.photo || jelly.photoPath) continue;
    jelly.photoPath = await uploadPhoto(uid, "jelly", jelly.id, jelly.photo);
    photosUp += 1;
  }
  for (const entry of entries) {
    if (!entry.photo || entry.photoPath) continue;
    entry.photoPath = await uploadPhoto(uid, "entry", entry.id, entry.photo);
    photosUp += 1;
  }

  if (jellies.length > 0) {
    const { error } = await client
      .from("jellies")
      .upsert(jellies.map((j) => jellyToRow(j, uid)));
    if (error) throw error;
  }
  if (entries.length > 0) {
    const { error } = await client
      .from("entries")
      .upsert(entries.map((e) => entryToRow(e, uid)));
    if (error) throw error;
  }

  // 묘비는 지웠다는 사실만 올린다
  for (const grave of graves) {
    const table = grave.kind === "jelly" ? "jellies" : "entries";
    const base =
      grave.kind === "jelly"
        ? { name: "", shape: "cube", color: "grape", created_at: grave.deletedAt }
        : { jelly_id: grave.id, status: "done", started_at: grave.deletedAt, created_at: grave.deletedAt };
    const { error } = await client
      .from(table)
      .upsert({ ...base, id: grave.id, user_id: uid, updated_at: grave.deletedAt, deleted_at: grave.deletedAt });
    if (error) throw error;
  }

  await db.transaction("rw", db.jellies, db.entries, db.graveyard, async () => {
    for (const j of jellies) await db.jellies.update(j.id, { dirty: 0, photoPath: j.photoPath });
    for (const e of entries) await db.entries.update(e.id, { dirty: 0, photoPath: e.photoPath });
    for (const g of graves) await db.graveyard.update(g.id, { dirty: 0 });
  });

  return { pushed: jellies.length + entries.length + graves.length, photosUp };
}

/* ---------- 내려받기 ---------- */

async function pull(uid: string, since: number) {
  const client = supabase!;
  const [jellyRes, entryRes] = await Promise.all([
    client.from("jellies").select("*").eq("user_id", uid).gt("updated_at", since),
    client.from("entries").select("*").eq("user_id", uid).gt("updated_at", since),
  ]);
  if (jellyRes.error) throw jellyRes.error;
  if (entryRes.error) throw entryRes.error;

  const graves = new Map((await db.graveyard.toArray()).map((g) => [g.id, g]));
  let pulled = 0;
  const wantPhotos: { kind: "jelly" | "entry"; id: string; path: string }[] = [];

  for (const raw of (jellyRes.data ?? []) as Row[]) {
    const id = raw.id as string;
    const remoteAt = Number(raw.updated_at);

    if (raw.deleted_at) {
      await db.jellies.delete(id);
      await db.graveyard.put({ id, kind: "jelly", deletedAt: Number(raw.deleted_at), dirty: 0 });
      pulled += 1;
      continue;
    }
    // 내가 더 최근에 지웠으면 되살리지 않는다
    const grave = graves.get(id);
    if (grave && grave.deletedAt >= remoteAt) continue;

    const local = await db.jellies.get(id);
    if (local && local.updatedAt >= remoteAt) continue;

    const next = rowToJelly(raw);
    await db.jellies.put({ ...next, photo: local?.photo });
    if (next.photoPath && !local?.photo) {
      wantPhotos.push({ kind: "jelly", id, path: next.photoPath });
    }
    pulled += 1;
  }

  for (const raw of (entryRes.data ?? []) as Row[]) {
    const id = raw.id as string;
    const remoteAt = Number(raw.updated_at);

    if (raw.deleted_at) {
      await db.entries.delete(id);
      await db.graveyard.put({ id, kind: "entry", deletedAt: Number(raw.deleted_at), dirty: 0 });
      pulled += 1;
      continue;
    }
    const grave = graves.get(id);
    if (grave && grave.deletedAt >= remoteAt) continue;

    const local = await db.entries.get(id);
    if (local && local.updatedAt >= remoteAt) continue;

    const next = rowToEntry(raw);
    await db.entries.put({ ...next, photo: local?.photo });
    if (next.photoPath && !local?.photo) {
      wantPhotos.push({ kind: "entry", id, path: next.photoPath });
    }
    pulled += 1;
  }

  // 사진은 무거우니 한 번에 다 받지 않는다
  let photosDown = 0;
  for (const want of wantPhotos.slice(0, PHOTOS_PER_RUN)) {
    const { data, error } = await client.storage.from(PHOTO_BUCKET).download(want.path);
    if (error || !data) continue;
    if (want.kind === "jelly") await db.jellies.update(want.id, { photo: data });
    else await db.entries.update(want.id, { photo: data });
    photosDown += 1;
  }

  return { pulled, photosDown, photosLeft: Math.max(0, wantPhotos.length - PHOTOS_PER_RUN) };
}

/* ---------- 설정 ---------- */

async function syncSettings(uid: string) {
  const client = supabase!;
  const [nickname, theme, muted, localAt] = await Promise.all([
    readSetting<string>("nickname"),
    readSetting<string>("theme"),
    readSetting<boolean>("muted"),
    readSetting<number>("settingsUpdatedAt"),
  ]);

  const { data } = await client.from("settings").select("*").eq("user_id", uid).maybeSingle();
  const remoteAt = data ? Number(data.updated_at) : 0;

  if (data && remoteAt > (localAt ?? 0)) {
    if (data.nickname) await writeSetting("nickname", data.nickname);
    if (data.theme) await writeSetting("theme", data.theme);
    if (typeof data.muted === "boolean") await writeSetting("muted", data.muted);
    await writeSetting("settingsUpdatedAt", remoteAt);
    return;
  }

  const at = localAt ?? Date.now();
  await client
    .from("settings")
    .upsert({ user_id: uid, nickname, theme, muted, updated_at: at });
  await writeSetting("settingsUpdatedAt", at);
}

/* ---------- 한 번 돌리기 ---------- */

export async function syncNow(): Promise<SyncReport | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return undefined;

  // 올리기가 먼저다. 내 변경을 먼저 얹어야 서버 것에 덮이지 않는다.
  const { pushed, photosUp } = await push(uid);

  const since = (await readSetting<number>(PULLED_AT)) ?? 0;
  const startedAt = Date.now();
  const { pulled, photosDown, photosLeft } = await pull(uid, since);
  await syncSettings(uid);
  // 돌리는 도중에 들어온 변경을 놓치지 않도록 시작 시각을 적는다
  await writeSetting(PULLED_AT, startedAt);

  return { pushed, pulled, photosUp, photosDown, photosLeft };
}

/** 로그인할 때 서버 것을 전부 다시 받기 위해 */
export async function resetPullCursor(): Promise<void> {
  await writeSetting(PULLED_AT, 0);
}

/** 로그아웃하면 이 기기의 기록은 지운다. 남의 폰에 남으면 안 된다. */
export async function wipeLocalAfterSignOut(): Promise<void> {
  await db.transaction("rw", db.jellies, db.entries, db.graveyard, db.meta, async () => {
    await Promise.all([db.jellies.clear(), db.entries.clear(), db.graveyard.clear()]);
    await db.meta.delete(PULLED_AT);
    await db.meta.delete("settingsUpdatedAt");
    await db.meta.delete("seedVersion");
  });
}
