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

/** 병 너비 대비 높이. 자리를 세로로 잡을 때 쓴다. */
const ASPECT = 200 / 275;
/** 병 벽에 붙은 젤리는 잘려 보인다. 양옆을 비워두고 그 안에만 쌓는다. */
const INSET = 0.12;
const SPAN = 1 - INSET * 2;
/** 알맹이 가운데가 이 높이에 오면 바닥에 닿아 보인다 */
const FLOOR = 0.988;
/** 옆 알과 이만큼 겹친다. 젤리는 원래 서로 파고들며 쌓인다. */
const OVERLAP = 1.9;
/** 가장 아래 줄에 들어갈 수 있는 최대 개수 */
const WIDEST = 8;

/** 가장 넓은 병은 위에 한 줄을 더 얹어 서른여덟 알까지 받는다 */
function rowsOf(width: number): number[] {
  if (width >= WIDEST) return [8, 7, 6, 5, 4, 3, 3, 2];
  const rows: number[] = [];
  for (let n = width; n >= 2; n -= 1) rows.push(n);
  return rows;
}

const capacityOf = (width: number) => rowsOf(width).reduce((a, b) => a + b, 0);

/**
 * 맨 아랫줄에 몇 알을 놓을지.
 *
 * 줄 수를 고정해두면 조금 먹은 달은 여덟 자리짜리 줄 한 칸에 서너 알만 박혀서,
 * 큰 병 바닥에 좁쌀이 흩어진 그림이 된다. 한 달에 젤리를 서른 개씩 먹는 사람은
 * 드무니 그게 보통 풍경이 돼버린다. 그래서 담긴 개수에 맞춰 줄을 좁힌다 -
 * 적게 담길수록 줄이 짧아지고, 짧은 줄일수록 알이 굵어진다.
 */
export function rowWidthFor(count: number): number {
  // 세 칸까지 좁히면 알이 주먹만 해진다. 넷이 바닥이다.
  for (let width = 4; width < WIDEST; width += 1) {
    if (capacityOf(width) >= count) return width;
  }
  return WIDEST;
}

/**
 * 이만큼 담겼을 때 알맹이 지름 (병 너비 대비).
 * 줄이 짧아지면 자리 간격이 벌어지고, 그 간격에 맞춰 알도 굵어진다.
 */
export function jellyRatioFor(count: number): number {
  const width = rowWidthFor(count);
  // 적게 담긴 병에서 알이 너무 커지지 않게 천장을 둔다
  return Math.min(0.25, (SPAN / (width + 1)) * OVERLAP);
}

/** 병 하나에 들어가는 최대 개수 — 넘치면 다음 달 병으로 */
export const JAR_CAPACITY = capacityOf(WIDEST);

export function layoutSlots(count: number, seed = 1): Slot[] {
  const rnd = makeRandom(seed);
  const rows = rowsOf(rowWidthFor(count));
  const ratio = jellyRatioFor(count);
  // 줄 간격과 바닥 높이는 알 크기를 따라간다. 고정해두면 굵은 알이 서로 파묻힌다.
  const rowHeight = ratio * ASPECT * 0.62;
  const baseY = FLOOR - (ratio * ASPECT) / 2;

  const slots: Slot[] = [];
  for (let row = 0; row < rows.length && slots.length < count; row++) {
    const n = rows[row];
    const here = Math.min(n, count - slots.length);
    const gap = 1 / (n + 1);
    // 덜 찬 줄은 가운데로 모은다. 안 그러면 왼쪽에만 붙어서 병이 기운 것처럼 보인다.
    const center = ((n - here) / 2) * gap;
    // 한 줄 걸러 반 칸씩 밀어야 위층이 아래층 틈에 얹힌다. 덜 찬 줄은 이미 밀려 있다.
    const stagger = here === n && row % 2 === 1 ? gap * 0.5 : 0;

    for (let i = 0; i < here; i++) {
      slots.push({
        x: INSET + (gap * (i + 1) + center + stagger + (rnd() - 0.5) * 0.07) * SPAN,
        y: baseY - row * rowHeight + (rnd() - 0.5) * rowHeight * 0.38,
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
