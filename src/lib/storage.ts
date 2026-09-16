import { useEffect, useState } from "react";

/**
 * 폰 안 저장소.
 *
 * 서버가 없으니 사진과 기록은 전부 여기 쌓인다. 그래서 두 가지를 챙겨야 한다.
 *
 * 하나는 '지워도 되는 데이터'로 분류되지 않게 하는 것. 브라우저는 기본적으로
 * 앱 저장소를 임시 취급해서, 기기가 빠듯해지면 말없이 비운다. iOS 는 브라우저
 * 탭으로만 쓴 사이트를 한동안 안 열면 아예 털어낸다. persist() 를 받아두면
 * 그 대상에서 빠진다.
 *
 * 다른 하나는 얼마나 찼는지 보여주는 것. 사진이 쌓이는 앱인데 남은 공간을
 * 볼 데가 없으면, 꽉 찬 걸 저장이 실패하고 나서야 알게 된다.
 */

export interface StorageUse {
  used: number;
  quota: number;
  /** 브라우저가 이 데이터를 함부로 지우지 않기로 했나 */
  persisted: boolean;
}

/**
 * 지우지 말아 달라고 부탁한다.
 *
 * 크롬은 얼마나 쓰는 앱인지 보고 알아서 판단하고, 사파리는 홈 화면에 추가한
 * 앱이면 대체로 내어준다. 거절당해도 앱은 그대로 돌아가니 조용히 넘어간다.
 */
export async function askPersist(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function readStorage(): Promise<StorageUse | undefined> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return undefined;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const persisted = (await navigator.storage.persisted?.()) ?? false;
    return { used: usage, quota, persisted };
  } catch {
    return undefined;
  }
}

export function useStorage(): StorageUse | undefined {
  const [use, setUse] = useState<StorageUse>();

  /* 저장소는 바깥 세상이다. effect 에서 읽어 오는 것 말고 방법이 없다. */
  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => {
    let alive = true;
    void readStorage().then((next) => {
      if (alive && next) setUse(next);
    });
    return () => {
      alive = false;
    };
  }, []);
  /* oxlint-enable react/set-state-in-effect */

  return use;
}

/** 사람이 읽는 크기. 소수점은 1GB 넘을 때만 쓸모가 있다. */
export function readableSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${Math.round(mb)}MB`;
  return `${(mb / 1024).toFixed(1)}GB`;
}

/**
 * 저장이 왜 실패했는지.
 *
 * 브라우저마다 이름이 다르다. 사파리는 QuotaExceededError 를 안 쓰고
 * 그냥 이름 없는 오류를 던질 때가 있어서, 문구까지 같이 본다.
 */
export function isFull(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  return /quota|storage|공간/i.test(err.message);
}
