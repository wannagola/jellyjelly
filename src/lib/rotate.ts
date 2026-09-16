/**
 * 도형 회전하기.
 *
 * 기준 도형 하나를 보여주고, 보기 넷 중 그것을 '돌리기만 한' 것을 고른다.
 * 뒤집은 것(거울상)은 오답이다 - 이게 이 문제의 전부다. 돌린 것과 뒤집은 것을
 * 눈으로 구별하는 게 심적 회전이다.
 *
 * 도형은 젤리 알을 몇 개 붙여 만든다. 알이 한 칸씩 붙은 덩어리라서 돌려도
 * 모양이 또렷하게 남고, 동그란 젤리 한 알로는 회전이 아예 안 보인다.
 *
 * 여기서 제일 조심할 것은 '오답이 사실은 정답인 경우'다. 어떤 도형은
 * 뒤집어도 돌린 것과 똑같아진다(대칭). 그런 도형을 기준으로 쓰면 거울상
 * 보기가 정답이 되어 답이 둘이 된다. 그래서 기준 도형은 반드시
 * 뒤집었을 때 달라지는 것만 쓴다.
 */

export type Cell = [number, number];

function makeRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** 왼쪽 위로 당겨 붙이고 순서를 맞춘다. 같은 모양이면 같은 글이 나오도록. */
export function normalize(cells: Cell[]): Cell[] {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells
    .map(([x, y]) => [x - minX, y - minY] as Cell)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export const keyOf = (cells: Cell[]): string =>
  normalize(cells)
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

/** 시계 방향 90도 */
export const rotate = (cells: Cell[]): Cell[] => normalize(cells.map(([x, y]) => [-y, x]));

/** 좌우로 뒤집기 */
export const mirror = (cells: Cell[]): Cell[] => normalize(cells.map(([x, y]) => [-x, y]));

export function turned(cells: Cell[], times: number): Cell[] {
  let out = normalize(cells);
  for (let i = 0; i < ((times % 4) + 4) % 4; i += 1) out = rotate(out);
  return out;
}

/** 돌리기만 해서 같아지나 */
export function sameTurned(a: Cell[], b: Cell[]): boolean {
  const target = keyOf(b);
  for (let i = 0; i < 4; i += 1) if (keyOf(turned(a, i)) === target) return true;
  return false;
}

/** 뒤집으면 달라지는 도형인가. 안 그러면 거울상 보기가 정답이 돼버린다. */
export const chiral = (cells: Cell[]): boolean => !sameTurned(cells, mirror(cells));

const STEPS: Cell[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** 알을 하나씩 옆에 붙여 나가며 덩어리를 만든다 */
function grow(size: number, span: number, rnd: () => number): Cell[] {
  for (let tries = 0; tries < 200; tries += 1) {
    const cells: Cell[] = [[0, 0]];
    const taken = new Set(["0,0"]);

    while (cells.length < size) {
      const from = cells[Math.floor(rnd() * cells.length)];
      const [dx, dy] = STEPS[Math.floor(rnd() * STEPS.length)];
      const next: Cell = [from[0] + dx, from[1] + dy];
      const id = `${next[0]},${next[1]}`;
      if (taken.has(id)) continue;

      const merged = normalize([...cells, next]);
      const w = Math.max(...merged.map(([x]) => x)) + 1;
      const h = Math.max(...merged.map(([, y]) => y)) + 1;
      // 길쭉하거나 넓적하면 회전이 너무 뻔해진다
      if (w > span || h > span) continue;

      cells.push(next);
      taken.add(id);
    }
    const shape = normalize(cells);
    if (chiral(shape)) return shape;
  }
  // 손으로 넣어 둔 비상용. 이건 확실히 뒤집으면 달라진다.
  return normalize([
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [0, 2],
  ]);
}

/** 알 하나를 떼어 다른 자리에 붙인다. 언뜻 비슷한데 다른 도형이 나온다. */
function nudge(cells: Cell[], rnd: () => number): Cell[] | undefined {
  for (let tries = 0; tries < 60; tries += 1) {
    const drop = Math.floor(rnd() * cells.length);
    const rest = cells.filter((_, i) => i !== drop);
    if (!connected(rest)) continue;

    const from = rest[Math.floor(rnd() * rest.length)];
    const [dx, dy] = STEPS[Math.floor(rnd() * STEPS.length)];
    const next: Cell = [from[0] + dx, from[1] + dy];
    if (rest.some(([x, y]) => x === next[0] && y === next[1])) continue;

    const shape = normalize([...rest, next]);
    if (!sameTurned(shape, cells)) return shape;
  }
  return undefined;
}

function connected(cells: Cell[]): boolean {
  if (cells.length === 0) return false;
  const ids = new Set(cells.map(([x, y]) => `${x},${y}`));
  const seen = new Set<string>();
  const queue: Cell[] = [cells[0]];
  seen.add(`${cells[0][0]},${cells[0][1]}`);

  while (queue.length > 0) {
    const [x, y] = queue.pop() as Cell;
    for (const [dx, dy] of STEPS) {
      const id = `${x + dx},${y + dy}`;
      if (!ids.has(id) || seen.has(id)) continue;
      seen.add(id);
      queue.push([x + dx, y + dy]);
    }
  }
  return seen.size === cells.length;
}

export interface Round {
  base: Cell[];
  options: { cells: Cell[]; correct: boolean }[];
  /**
   * 기준과 보기가 전부 들어가는 칸 수.
   *
   * 보기마다 제 크기에 맞춰 그리면 안 된다. 알이 같은 수라도 어떤 건 3칸,
   * 어떤 건 4칸에 걸쳐서, 칸에 꽉 맞춰 그리면 알 크기가 달라진다. 그러면
   * 모양을 안 봐도 크기만 보고 튀는 것을 고르게 된다. 다 같은 칸에 그린다.
   */
  span: number;
}

/** 이 도형이 차지하는 가로세로 중 긴 쪽 */
function extentOf(cells: Cell[]): number {
  const box = normalize(cells);
  return Math.max(
    Math.max(...box.map(([x]) => x)) + 1,
    Math.max(...box.map(([, y]) => y)) + 1,
  );
}

/** 판이 올라갈수록 알이 늘고 칸이 넓어진다 */
export function stageOf(solved: number): { size: number; span: number } {
  if (solved < 4) return { size: 4, span: 3 };
  if (solved < 9) return { size: 5, span: 3 };
  if (solved < 15) return { size: 5, span: 4 };
  return { size: 6, span: 4 };
}

/**
 * 한 문제.
 *
 * 정답은 기준을 돌린 것 하나뿐이다. 오답은 거울상 하나와, 알 하나를 옮긴
 * 비슷한 도형 둘. 셋 다 기준과 돌려서 같아지지 않는 것만 남긴다.
 */
export function makeRound(solved: number, seed: number): Round {
  const rnd = makeRandom(seed);
  const { size, span } = stageOf(solved);
  const base = grow(size, span, rnd);

  const wrong: Cell[][] = [];
  const add = (shape: Cell[] | undefined, tight = true) => {
    if (!shape) return;
    // 기준보다 넓게 퍼진 보기는 크기만 보고도 튄다. 웬만하면 안 쓴다.
    if (tight && extentOf(shape) > span) return;
    if (sameTurned(shape, base)) return;
    if (wrong.some((had) => sameTurned(had, shape))) return;
    wrong.push(turned(shape, Math.floor(rnd() * 4)));
  };

  // 거울상은 반드시 하나 넣는다. 이게 이 문제의 함정이다.
  // 거울상은 기준과 같은 칸을 쓰니 크기 검사를 걸 필요가 없다.
  add(mirror(base), false);
  for (let i = 0; wrong.length < 3 && i < 60; i += 1) add(nudge(base, rnd));
  for (let i = 0; wrong.length < 3 && i < 60; i += 1) add(grow(size, span, rnd));
  // 그래도 모자라면 넓게 퍼진 것이라도 받는다. 답이 셋뿐인 문제보다는 낫다.
  for (let i = 0; wrong.length < 3 && i < 60; i += 1) add(nudge(base, rnd), false);

  const options = [
    { cells: turned(base, 1 + Math.floor(rnd() * 3)), correct: true },
    ...wrong.slice(0, 3).map((cells) => ({ cells, correct: false })),
  ];

  // 정답 자리를 섞는다
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // 하나라도 삐져나가면 다 같이 넓은 칸에 그린다
  const fit = Math.max(extentOf(base), ...options.map((o) => extentOf(o.cells)));
  return { base, options, span: fit };
}
