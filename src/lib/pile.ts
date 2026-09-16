import type { JellyColor, JellyShape } from "../data/types";

export interface Slot {
  key: string;
  /** 병 좌표계(0~1) — 병 크기가 바뀌어도 같은 더미가 나온다 */
  x: number;
  y: number;
  rotate: number;
}

export interface PileItem extends Slot {
  shape: JellyShape;
  color: JellyColor;
}

/** 같은 씨앗이면 같은 병이 나오도록 하는 결정적 난수 */
function makeRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** 아래부터 한 줄씩 좁혀가며 쌓는다 */
const ROWS = [8, 7, 6, 5, 4, 3, 3, 2];

/** 병 하나에 들어가는 최대 개수 — 넘치면 다음 달 병으로 */
export const JAR_CAPACITY = ROWS.reduce((a, b) => a + b, 0);

export function layoutSlots(count: number, seed = 1): Slot[] {
  const rnd = makeRandom(seed);
  const slots: Slot[] = [];
  const rowHeight = 0.072;
  const baseY = 0.93;

  // 병 벽에 붙은 젤리는 잘려 보인다. 양옆을 비워두고 그 안에만 쌓는다.
  const inset = 0.12;
  const span = 1 - inset * 2;

  for (let row = 0; row < ROWS.length && slots.length < count; row++) {
    const n = ROWS[row];
    const gap = 1 / (n + 1);
    // 한 줄 걸러 반 칸씩 밀어야 위층이 아래층 틈에 얹힌다
    const stagger = row % 2 === 0 ? 0 : gap * 0.5;
    for (let i = 0; i < n && slots.length < count; i++) {
      slots.push({
        key: `${row}-${i}`,
        x: inset + (gap * (i + 1) + stagger + (rnd() - 0.5) * 0.05) * span,
        y: baseY - row * rowHeight + (rnd() - 0.5) * 0.02,
        rotate: (rnd() - 0.5) * 42,
      });
    }
  }
  return slots;
}

/** 먼저 먹은 젤리가 아래에 깔린다 */
export function buildPile(jellies: { shape: JellyShape; color: JellyColor }[], seed = 7): PileItem[] {
  const slots = layoutSlots(Math.min(jellies.length, JAR_CAPACITY), seed);
  return slots.map((slot, i) => ({ ...slot, ...jellies[i] }));
}
