import { db } from "../data/db";
import type { Entry, Jelly } from "../data/types";

const VERSION = 1;

interface BackupJelly extends Omit<Jelly, "photo"> {
  photo?: string;
}

export interface Backup {
  app: "jellyjelly";
  version: number;
  exportedAt: number;
  jellies: BackupJelly[];
  entries: Entry[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("사진을 읽지 못했습니다"));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

/**
 * 기록과 사진을 파일 하나로. 서버가 있어도 무료 플랜엔 자동 백업이 없어서
 * 이 버튼은 끝까지 남는다.
 */
export async function buildBackup(): Promise<Backup> {
  const [jellies, entries] = await Promise.all([db.jellies.toArray(), db.entries.toArray()]);

  return {
    app: "jellyjelly",
    version: VERSION,
    exportedAt: Date.now(),
    entries,
    jellies: await Promise.all(
      jellies.map(async ({ photo, ...rest }) => ({
        ...rest,
        photo: photo ? await blobToDataUrl(photo) : undefined,
      })),
    ),
  };
}

export function downloadBackup(backup: Backup): void {
  const stamp = new Date(backup.exportedAt).toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `젤리젤리-백업-${stamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();

  // 바로 지우면 사파리가 내려받기 전에 URL이 사라진다
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export interface RestoreResult {
  jellies: number;
  entries: number;
}

/**
 * 같은 id는 덮어쓰고 없는 건 넣는다. 지금 기기에만 있는 기록은 건드리지 않는다 —
 * 복원 때문에 뭔가 사라지는 일은 없어야 한다.
 */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  const parsed: unknown = JSON.parse(await file.text());

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Backup).app !== "jellyjelly" ||
    !Array.isArray((parsed as Backup).jellies)
  ) {
    throw new Error("젤리젤리 백업 파일이 아니에요");
  }

  const backup = parsed as Backup;
  if (backup.version > VERSION) {
    throw new Error("더 새로운 버전의 백업이에요. 앱을 먼저 업데이트해 주세요");
  }

  const jellies: Jelly[] = await Promise.all(
    backup.jellies.map(async ({ photo, ...rest }) => ({
      ...rest,
      photo: photo ? await dataUrlToBlob(photo) : undefined,
    })),
  );

  await db.transaction("rw", db.jellies, db.entries, async () => {
    await db.jellies.bulkPut(jellies);
    await db.entries.bulkPut(backup.entries ?? []);
  });

  return { jellies: jellies.length, entries: backup.entries?.length ?? 0 };
}

export async function wipeEverything(): Promise<void> {
  await db.transaction("rw", db.jellies, db.entries, db.meta, db.graveyard, async () => {
    await Promise.all([
      db.jellies.clear(),
      db.entries.clear(),
      db.meta.clear(),
      db.graveyard.clear(),
    ]);
  });
}
