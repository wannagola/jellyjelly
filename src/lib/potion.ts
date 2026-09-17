/**
 * 마법약 만들기.
 *
 * 재료 여섯 개가 있는데 각각 무슨 색인지는 안 알려준다. 둘을 섞으면 섞인 색이
 * 나오고, 그 결과를 보고 재료의 색을 거꾸로 알아내는 게 전부다.
 *
 * 규칙은 물감 섞기 그대로다. 빨강+파랑은 보라, 파랑+노랑은 초록, 빨강+노랑은
 * 주황. 같은 색끼리 섞으면 그 색 그대로.
 *
 * 그래서 결과 하나가 정보 하나다 - 보라가 나왔으면 그 둘은 {빨강, 파랑}이고,
 * 빨강이 나왔으면 둘 다 빨강이다. 목표가 보라인데 방금 초록이 나왔다면 그 둘은
 * {파랑, 노랑}이니, 그중 파랑인 쪽을 찾아 빨강과 붙이면 된다.
 */

export type Base = "red" | "blue" | "yellow";
export type Result = Base | "purple" | "green" | "orange";

export const RESULT_NAME: Record<Result, string> = {
  red: "빨강",
  blue: "파랑",
  yellow: "노랑",
  purple: "보라",
  green: "초록",
  orange: "주황",
};

/** 화면에 칠할 색. 젤리 색판에서 가져와 결이 맞게 둔다. */
export const RESULT_TONE: Record<Result, string> = {
  red: "#EF5D7A",
  blue: "#5BB8E0",
  yellow: "#EFC93C",
  purple: "#8E5BC9",
  green: "#7CC36A",
  orange: "#F59940",
};

/** 두 재료를 섞으면 나오는 색 */
export function mix(a: Base, b: Base): Result {
  if (a === b) return a;
  const pair = [a, b].sort().join("+");
  if (pair === "blue+red") return "purple";
  if (pair === "blue+yellow") return "green";
  return "orange"; // red+yellow
}

/** 섞어서 나올 수 있는 색들 */
export const MIXED: Result[] = ["purple", "green", "orange"];

export interface Puzzle {
  /** 재료마다 숨어 있는 색. 화면에는 안 보여준다. */
  hidden: Base[];
  target: Result;
  /** 몇 번까지 섞어볼 수 있나 */
  tries: number;
}

function makeRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffled<T>(items: T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 재료 여섯에 색을 나눠 담는다.
 *
 * 세 색을 둘씩 넣는다. 그러면 어떤 섞은 색을 목표로 삼아도 만드는 짝이 네 쌍씩
 * 있어서, 운이 나빠 못 푸는 판이 안 나온다. 한 색을 하나만 넣으면 그 색이
 * 걸린 목표는 두 쌍뿐이라 첫 판부터 막히는 사람이 생긴다.
 */
export function makePuzzle(solved: number, seed: number): Puzzle {
  const rnd = makeRandom(seed);
  const hidden = shuffled<Base>(["red", "red", "blue", "blue", "yellow", "yellow"], rnd);
  const target = MIXED[Math.floor(rnd() * MIXED.length)];
  // 익숙해지면 손에 쥔 기회를 줄인다. 찍어서 맞을 자리를 좁히는 것이다.
  const tries = solved < 3 ? 4 : solved < 8 ? 3 : 2;
  return { hidden, target, tries };
}

/** 이번 판에서 목표를 만드는 짝들 */
export function winners(puzzle: Puzzle): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 0; a < puzzle.hidden.length; a += 1) {
    for (let b = a + 1; b < puzzle.hidden.length; b += 1) {
      if (mix(puzzle.hidden[a], puzzle.hidden[b]) === puzzle.target) out.push([a, b]);
    }
  }
  return out;
}

/**
 * 몇 번 만에 맞혔는지로 주는 점수. 남은 기회에 하나를 더한 값이다.
 *
 * 처음엔 '4 빼기 쓴 횟수'로 뒀다가 뒤집었다. 그러면 운 좋게 첫 판에 맞힌
 * 사람이 제일 높은 점수를 받고, 끝까지 좁혀서 맞힌 사람은 손해를 본다.
 * 재보니 찍는 사람 평균 1.82점, 추론하는 사람 1.61점이 나왔다 - 생각할수록
 * 손해인 추론 게임이었던 셈이다.
 *
 * 맞히는 것 자체에 먼저 값을 매기고 빨리 맞힌 만큼만 얹는다. 첫 수는 아무
 * 정보가 없어 누구에게나 운이지만, 두 번째부터는 앞의 결과를 읽은 사람만
 * 좁힐 수 있다.
 */
export const scoreFor = (used: number, tries: number): number =>
  Math.max(1, tries - used + 1);
