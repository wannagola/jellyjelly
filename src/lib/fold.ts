/**
 * 돌려 맞추기.
 *
 * 변경 전 모양과 변경 후 모양을 보여주고, 네 가지 손질을 조합해서
 * 앞의 것을 뒤의 것으로 만든다. 단 최소 횟수여야 한다.
 *
 * 45도씩 도니까 도형은 격자로 그릴 수 없다. 칸에 든 알을 45도 돌리면
 * 칸 밖으로 나간다. 그래서 자유 형태로 그린 도형 하나를 통째로 돌린다.
 *
 * 상태는 열여섯 가지뿐이다 - 회전 여덟(45도씩) × 뒤집힘 둘. 그래서
 * 최소 횟수는 추측할 것 없이 너비 우선 탐색으로 정확히 구한다.
 */

export type Move = "left" | "right" | "flipH" | "flipV";

export const MOVES: Move[] = ["left", "right", "flipH", "flipV"];

export const MOVE_NAME: Record<Move, string> = {
  left: "왼쪽으로 45°",
  right: "오른쪽으로 45°",
  flipH: "좌우 뒤집기",
  flipV: "위아래 뒤집기",
};

/** 고른 것을 줄줄이 적을 때 쓰는 짧은 이름 */
export const MOVE_SHORT: Record<Move, string> = {
  left: "45° 왼쪽",
  right: "45° 오른쪽",
  flipH: "좌우반전",
  flipV: "상하반전",
};

export interface Pose {
  /** 45도 단위 회전 (0~7) */
  turn: number;
  /** 좌우로 뒤집혔나 */
  flipped: boolean;
}

export const START: Pose = { turn: 0, flipped: false };

/** 있을 수 있는 모든 모양 - 회전 여덟 × 뒤집힘 둘 */
export const allPoses = (): Pose[] =>
  Array.from({ length: 16 }, (_, i) => ({ turn: i % 8, flipped: i >= 8 }));

export const samePose = (a: Pose, b: Pose) => a.turn === b.turn && a.flipped === b.flipped;
const keyOf = (p: Pose) => `${p.turn}${p.flipped ? "f" : ""}`;

/**
 * 지금 모양에 손질 하나를 더한다.
 *
 * 화면은 `rotate(turn×45°) 다음 좌우뒤집기` 순서로 그린다. 그래서 새 손질은
 * 그 앞에 붙는데, 뒤집기와 회전은 자리를 바꾸면 회전 방향이 뒤집힌다
 * (뒤집은 세상에서는 시계 방향이 반시계 방향이다). 그래서 뒤집을 때
 * 회전값의 부호가 같이 바뀐다. 위아래 뒤집기는 좌우 뒤집고 180도 돈 것과 같다.
 */
export function apply(pose: Pose, move: Move): Pose {
  const { turn, flipped } = pose;
  switch (move) {
    case "right":
      return { turn: (turn + 1) % 8, flipped };
    case "left":
      return { turn: (turn + 7) % 8, flipped };
    case "flipH":
      return { turn: (8 - turn) % 8, flipped: !flipped };
    case "flipV":
      return { turn: (12 - turn) % 8, flipped: !flipped };
  }
}

export const applyAll = (moves: Move[], from: Pose = START): Pose =>
  moves.reduce<Pose>(apply, from);

/** 이 버튼들만 가지고 각 모양까지 몇 번이면 되는지 */
function walk(gens: Move[]): Map<string, number> {
  const seen = new Map<string, number>([[keyOf(START), 0]]);
  const queue: Pose[] = [START];

  while (queue.length > 0) {
    const pose = queue.shift() as Pose;
    const steps = seen.get(keyOf(pose)) as number;
    for (const move of gens) {
      const next = apply(pose, move);
      if (seen.has(keyOf(next))) continue;
      seen.set(keyOf(next), steps + 1);
      queue.push(next);
    }
  }
  return seen;
}

const cache = new Map<string, Map<string, number>>();
function table(gens: Move[]): Map<string, number> {
  const id = gens.join("|");
  let found = cache.get(id);
  if (!found) {
    found = walk(gens);
    cache.set(id, found);
  }
  return found;
}

/** 이 버튼들로 처음 모양에서 그 모양까지의 최소 횟수. 못 가면 undefined. */
export const stepsTo = (pose: Pose, gens: Move[]): number | undefined =>
  table(gens).get(keyOf(pose));

function makeRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export interface Puzzle {
  target: Pose;
  /** 이만큼이면 된다 */
  best: number;
  /** 이번에 쓸 수 있는 버튼 */
  gens: Move[];
}

/**
 * 난이도는 목표를 멀리 두는 게 아니라 버튼을 빼서 올린다.
 *
 * 갈 수 있는 모양이 열여섯뿐이라, 버튼 넷을 다 주면 아무리 멀어도 세 번이면
 * 닿는다. 버튼을 하나 빼면 넷, 둘 빼면 다섯 번까지 멀어진다. 그리고 도구가
 * 줄면 머릿속에서 더 많이 굴려봐야 해서, 거리보다 이쪽이 훨씬 어렵다.
 *
 * 다만 아무 둘이나 빼면 안 된다. 좌우 뒤집기와 위아래 뒤집기만 남기면
 * 네 모양밖에 못 가서 풀 수 없는 문제가 나온다. 회전이 하나는 있어야 한다.
 */
const SETS: { gens: Move[]; want: number }[] = [
  { gens: ["left", "right", "flipH", "flipV"], want: 2 },
  { gens: ["left", "right", "flipH", "flipV"], want: 3 },
  { gens: ["right", "flipH", "flipV"], want: 4 },
  { gens: ["left", "flipH", "flipV"], want: 4 },
  { gens: ["right", "flipH"], want: 5 },
  { gens: ["left", "flipV"], want: 5 },
];

export function stageOf(solved: number): number {
  if (solved < 3) return 0;
  if (solved < 7) return 1;
  if (solved < 12) return 2;
  return 4;
}

/**
 * 한 문제.
 *
 * 한 번이면 되는 모양은 안 낸다 - 버튼을 차례로 눌러보면 걸려서 문제가 안 된다.
 */
export function makePuzzle(solved: number, seed: number): Puzzle {
  const rnd = makeRandom(seed);
  const at = stageOf(solved);
  // 같은 단계 안에서도 버튼 짝을 섞는다. 늘 같은 둘이면 외워진다.
  const picked = SETS[at + (at >= 2 && rnd() < 0.5 ? 1 : 0)] ?? SETS[0];
  const { gens, want } = picked;

  const reach = table(gens);
  const poses = allPoses().filter((p) => reach.has(keyOf(p)));
  const pool = poses.filter((p) => reach.get(keyOf(p)) === want);
  const fallback = poses.filter((p) => (reach.get(keyOf(p)) ?? 0) >= 2);
  const from = pool.length > 0 ? pool : fallback;
  const target = from[Math.floor(rnd() * from.length)];

  return { target, best: reach.get(keyOf(target)) as number, gens };
}
