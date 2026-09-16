import { differenceInCalendarDays } from "date-fns";
import type { Entry, Jelly } from "../data/types";

export interface DrawResult {
  jelly: Jelly;
  /** 왜 이게 나왔는지 한 줄. 이유 없는 뽑기는 그냥 난수다. */
  reason: string;
}

/** 방금 먹은 게 또 나오면 김샌다 */
const COOLDOWN_DAYS = 7;

/**
 * 오늘 먹을 젤리 하나. 못 고르겠을 때 대신 골라주는 게 전부라서
 * 똑똑할 필요는 없고, 납득만 되면 된다.
 */
export function drawJelly(
  jellies: Jelly[],
  entries: Entry[],
  random: () => number = Math.random,
  now = Date.now(),
): DrawResult | undefined {
  if (jellies.length === 0) return undefined;

  const lastEaten = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status !== "done" || !entry.finishedAt) continue;
    lastEaten.set(entry.jellyId, Math.max(lastEaten.get(entry.jellyId) ?? 0, entry.finishedAt));
  }

  const daysSince = (id: string) => {
    const at = lastEaten.get(id);
    return at === undefined ? undefined : differenceInCalendarDays(now, at);
  };

  // 최근에 먹은 건 빼둔다. 다 빼고 나면 어쩔 수 없이 전부를 후보로.
  const fresh = jellies.filter((j) => {
    const days = daysSince(j.id);
    return days === undefined || days >= COOLDOWN_DAYS;
  });
  const pool = fresh.length > 0 ? fresh : jellies;

  const weightOf = (jelly: Jelly) => {
    let weight = 1;
    if (jelly.favorite) weight += 2;
    if (daysSince(jelly.id) === undefined) weight += 1; // 아직 안 먹어본 것
    return weight;
  };

  const total = pool.reduce((sum, j) => sum + weightOf(j), 0);
  let ticket = random() * total;
  let picked = pool[pool.length - 1];
  for (const jelly of pool) {
    ticket -= weightOf(jelly);
    if (ticket <= 0) {
      picked = jelly;
      break;
    }
  }

  return { jelly: picked, reason: reasonFor(picked, daysSince(picked.id)) };
}

function reasonFor(jelly: Jelly, days: number | undefined): string {
  if (jelly.favorite) return "최애잖아요";
  if (days === undefined) return "아직 한 번도 안 먹어봤어요";
  if (days >= 60) return `${days}일 만이에요`;
  if (days >= COOLDOWN_DAYS) return `${days}일째 안 먹었어요`;
  return "오늘은 이거예요";
}
