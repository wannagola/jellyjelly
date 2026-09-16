import { differenceInCalendarDays } from "date-fns";
import type { Entry, Jelly, JellyColor, JellyShape } from "../data/types";
import { COLOR_NAMES } from "./jelly";

/**
 * 혼자 쓰는 앱이라 "남들이 좋아한 젤리"는 만들 수 없다.
 * 추천의 재료는 오직 내 기록뿐이다 - 내가 뭘 높게 줬는지, 뭘 오래 안 먹었는지,
 * 어디를 아직 안 가봤는지.
 */

/** 별점을 선호 가중치로. 3점이 기준선이라 그보다 높으면 +, 낮으면 -. */
const affinityOf = (rating?: number) => (typeof rating === "number" ? rating - 3 : 0);

/** 식감 프로필용 가중치. 싫어한 젤리의 식감은 내 취향이 아니다. */
const tasteWeightOf = (rating?: number) =>
  typeof rating === "number" ? Math.max(0, rating - 2) : 1;

export interface Ranked<T extends string> {
  key: T;
  score: number;
  count: number;
}

export interface TasteProfile {
  /** 별점을 남긴 기록 수 */
  rated: number;
  /** 다 먹은 기록 수 */
  eaten: number;
  texture?: { chewy: number; sour: number; sweet: number };
  brands: Ranked<string>[];
  colors: Ranked<JellyColor>[];
  shapes: Ranked<JellyShape>[];
}

function rank<T extends string>(rows: { key: T; score: number }[]): Ranked<T>[] {
  const table = new Map<T, { score: number; count: number }>();
  for (const row of rows) {
    const prev = table.get(row.key) ?? { score: 0, count: 0 };
    table.set(row.key, { score: prev.score + row.score, count: prev.count + 1 });
  }
  return [...table.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.score - a.score || b.count - a.count);
}

export function buildTaste(jellies: Jelly[], entries: Entry[]): TasteProfile {
  const byId = new Map(jellies.map((j) => [j.id, j]));
  const done = entries.filter((e) => e.status === "done");

  const brandRows: { key: string; score: number }[] = [];
  const colorRows: { key: JellyColor; score: number }[] = [];
  const shapeRows: { key: JellyShape; score: number }[] = [];

  let chewy = 0;
  let sour = 0;
  let sweet = 0;
  let weight = 0;
  let rated = 0;

  for (const entry of done) {
    const jelly = byId.get(entry.jellyId);
    if (!jelly) continue;

    const affinity = affinityOf(entry.rating);
    if (jelly.brand) brandRows.push({ key: jelly.brand, score: affinity });
    colorRows.push({ key: jelly.color, score: affinity });
    shapeRows.push({ key: jelly.shape, score: affinity });

    if (typeof entry.rating === "number") rated += 1;
    if (entry.texture) {
      const w = tasteWeightOf(entry.rating);
      chewy += entry.texture.chewy * w;
      sour += entry.texture.sour * w;
      sweet += entry.texture.sweet * w;
      weight += w;
    }
  }

  return {
    rated,
    eaten: done.length,
    texture: weight > 0 ? { chewy: chewy / weight, sour: sour / weight, sweet: sweet / weight } : undefined,
    brands: rank(brandRows),
    colors: rank(colorRows),
    shapes: rank(shapeRows),
  };
}

export interface Suggestion {
  jelly: Jelly;
  /** 왜 골랐는지 한 줄. 이유 없는 추천은 안 누른다. */
  reason: string;
}

/** 한 번이라도 다 먹은 젤리의 마지막 날짜와 최고 별점 */
function historyOf(entries: Entry[]) {
  const last = new Map<string, number>();
  const best = new Map<string, number>();
  for (const e of entries) {
    if (e.status !== "done") continue;
    if (e.finishedAt) last.set(e.jellyId, Math.max(last.get(e.jellyId) ?? 0, e.finishedAt));
    if (typeof e.rating === "number") {
      best.set(e.jellyId, Math.max(best.get(e.jellyId) ?? 0, e.rating));
    }
  }
  return { last, best };
}

/** 며칠 이상 지나야 '다시 만날 때'가 된다. 그저께 먹은 걸 다시 권하면 헛소리다. */
const REVISIT_AFTER_DAYS = 7;

/** 좋아했는데 요즘 안 먹은 것. 추천 중에 제일 잘 먹힌다. */
export function revisits(jellies: Jelly[], entries: Entry[], now = Date.now()): Suggestion[] {
  const { last, best } = historyOf(entries);

  return jellies
    .filter((j) => (best.get(j.id) ?? 0) >= 4 && last.has(j.id))
    .map((jelly) => ({
      jelly,
      days: differenceInCalendarDays(now, last.get(jelly.id) ?? now),
    }))
    .filter((row) => row.days >= REVISIT_AFTER_DAYS)
    .sort((a, b) => b.days - a.days)
    .slice(0, 4)
    .map(({ jelly, days }) => ({
      jelly,
      reason: `${days}일째 안 먹었어요 · ★${best.get(jelly.id)}`,
    }));
}

/**
 * 아직 안 먹어본 젤리 중 내 취향에 가까운 것.
 * 안 먹어본 젤리엔 식감 데이터가 없으니 브랜드·색·모양으로 짐작한다.
 */
export function closeToTaste(
  jellies: Jelly[],
  entries: Entry[],
  taste: TasteProfile,
): Suggestion[] {
  const { last } = historyOf(entries);
  const brand = new Map(taste.brands.map((b) => [b.key, b.score]));
  const color = new Map(taste.colors.map((c) => [c.key, c.score]));
  const shape = new Map(taste.shapes.map((s) => [s.key, s.score]));

  return jellies
    .filter((j) => !last.has(j.id))
    .map((jelly) => {
      const hits: string[] = [];
      let score = 0;

      if (jelly.brand && (brand.get(jelly.brand) ?? 0) > 0) {
        score += 3;
        hits.push(`${jelly.brand} 좋아하시잖아요`);
      }
      if ((color.get(jelly.color) ?? 0) > 0) {
        score += 2;
        hits.push("좋아하는 색");
      }
      if ((shape.get(jelly.shape) ?? 0) > 0) {
        score += 1;
        hits.push("좋아하는 모양");
      }
      return { jelly, score, reason: hits[0] ?? "" };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ jelly, reason }) => ({ jelly, reason }));
}

/**
 * 아직 손대지 않은 브랜드와 색. 취향이 굳는 걸 막는 자리라서
 * 새 브랜드를 새 색보다 먼저 내민다.
 * exclude로 이미 위 칸에 뜬 젤리를 걸러낸다 - 같은 젤리가 두 번 나오면 추천이 아니라 목록이다.
 */
export function unexplored(
  jellies: Jelly[],
  entries: Entry[],
  exclude: ReadonlySet<string> = new Set(),
): Suggestion[] {
  const { last } = historyOf(entries);
  const byId = new Map(jellies.map((j) => [j.id, j]));

  const triedBrands = new Set<string>();
  const triedColors = new Set<JellyColor>();
  for (const id of last.keys()) {
    const jelly = byId.get(id);
    if (!jelly) continue;
    if (jelly.brand) triedBrands.add(jelly.brand);
    triedColors.add(jelly.color);
  }

  const fresh = jellies.filter((j) => !last.has(j.id) && !exclude.has(j.id));
  const out: Suggestion[] = [];
  const taken = new Set<string>();
  const seenBrand = new Set<string>();

  for (const jelly of fresh) {
    if (!jelly.brand || triedBrands.has(jelly.brand) || seenBrand.has(jelly.brand)) continue;
    seenBrand.add(jelly.brand);
    taken.add(jelly.id);
    out.push({ jelly, reason: `${jelly.brand}는 아직이에요` });
    if (out.length >= 4) return out;
  }

  const seenColor = new Set<JellyColor>();
  for (const jelly of fresh) {
    if (taken.has(jelly.id) || triedColors.has(jelly.color) || seenColor.has(jelly.color)) continue;
    seenColor.add(jelly.color);
    out.push({ jelly, reason: `${COLOR_NAMES[jelly.color]} 맛은 아직이에요` });
    if (out.length >= 4) break;
  }
  return out;
}

/** 기록이 없을 때 - 아무거나 골라주되 매일 같은 걸 내밀지는 않는다 */
export function coldStart(jellies: Jelly[], entries: Entry[], today = new Date()): Suggestion[] {
  const { last } = historyOf(entries);
  const fresh = jellies.filter((j) => !last.has(j.id));
  if (fresh.length === 0) return [];

  // 날짜마다 순서를 섞어두고 앞에서 세 개. 하루 동안은 같은 걸 보여준다.
  const offset = today.getFullYear() * 400 + today.getMonth() * 31 + today.getDate();
  return fresh
    .map((jelly, i) => ({ jelly, order: ((i + 1) * 2654435761 + offset * 40503) % 1000003 }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map(({ jelly }) => ({ jelly, reason: "오늘의 제안" }));
}
