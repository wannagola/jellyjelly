import type { JellyColor, JellyShape } from "../data/types";

export interface Slot {
  /** 병 좌표계(0~1) - 병 크기가 바뀌어도 같은 더미가 나온다 */
  x: number;
  y: number;
  rotate: number;
}

/** 병에 들어갈 젤리 하나. id는 그 젤리를 담은 기록의 id다. */
export interface PileSource {
  id: string;
  shape: JellyShape;
  color: JellyColor;
}

export interface PileItem extends Slot, PileSource {
  key: string;
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
        x: inset + (gap * (i + 1) + stagger + (rnd() - 0.5) * 0.07) * span,
        y: baseY - row * rowHeight + (rnd() - 0.5) * 0.028,
        rotate: (rnd() - 0.5) * 42,
      });
    }
  }
  return slots;
}

/** 씨앗이 같으면 같은 순서가 나오는 셔플 */
function shuffled<T>(items: T[], seed: number): T[] {
  const rnd = makeRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 기본은 먼저 먹은 젤리가 아래에 깔린다.
 *
 * shuffle 을 켜면 순서까지 뒤섞는다. 자리 흔들림만 바꾸면 1~2%밖에 안 움직여서
 * 눈에 보이지도 않는다. 진짜 병을 흔들면 젤리가 자리를 바꾸니까 여기서도 그렇게 한다.
 *
 * 키를 기록 id 로 두는 게 핵심이다. 순번을 키로 쓰면 그 자리의 젤리가 다른 젤리로
 * 갈아끼워질 뿐이고, id 로 둬야 같은 젤리가 새 자리로 실제로 날아간다.
 */
export function buildPile(jellies: PileSource[], seed = 7, shuffle = false): PileItem[] {
  const capped = jellies.slice(0, JAR_CAPACITY);
  const ordered = shuffle ? shuffled(capped, seed) : capped;
  return layoutSlots(ordered.length, seed).map((slot, i) => ({
    ...slot,
    ...ordered[i],
    key: ordered[i].id,
  }));
}
