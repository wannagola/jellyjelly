/**
 * 길 만들기 퍼즐 만들기.
 *
 * 같은 색 젤리 둘을 길로 잇되, 길끼리 겹치면 안 되고 빈 칸이 남아도 안 된다.
 *
 * 문제를 무작위로 찍어놓고 풀리는지 확인하는 방식은 못 쓴다. 풀리는 배치가
 * 나올 때까지 돌려야 하고, 언제 나올지 알 수가 없다. 그래서 거꾸로 간다 -
 * 모든 칸을 한 번씩 지나는 길(해밀턴 경로)을 하나 만들어서 토막으로 자른다.
 * 토막들은 겹칠 수가 없고 다 합치면 판 전체를 덮는다. 즉 답을 먼저 만들고
 * 그 양 끝만 남겨서 문제로 낸다. 반드시 풀린다.
 */

export interface Puzzle {
  size: number;
  /** 각 쌍의 두 끝 칸 (칸 번호 = row * size + col) */
  pairs: { a: number; b: number }[];
  /** 만들 때 쓴 답. 힌트와 자체 검사에 쓴다. */
  solution: number[][];
}

function makeRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** 격자에서 맞닿은 칸들 */
function neighbours(cell: number, size: number): number[] {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const out: number[] = [];
  if (row > 0) out.push(cell - size);
  if (row < size - 1) out.push(cell + size);
  if (col > 0) out.push(cell - 1);
  if (col < size - 1) out.push(cell + 1);
  return out;
}

export const adjacent = (a: number, b: number, size: number): boolean =>
  neighbours(a, size).includes(b);

/**
 * 모든 칸을 한 번씩 지나는 길.
 *
 * 뱀처럼 훑는 길에서 시작한다 - 그건 언제나 모든 칸을 지난다. 거기서
 * '백바이트'를 반복한다: 끝 칸에 맞닿은 칸 하나를 골라 그 뒤쪽을 통째로
 * 뒤집는다. 뒤집어도 여전히 모든 칸을 한 번씩 지나는 길이라서, 몇천 번
 * 흔들면 매번 다른 모양이 나오면서도 조건은 안 깨진다.
 */
export function hamiltonian(size: number, rnd: () => number): number[] {
  const path: number[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let i = 0; i < size; i += 1) {
      const col = row % 2 === 0 ? i : size - 1 - i;
      path.push(row * size + col);
    }
  }

  const where = new Array<number>(size * size);
  const reindex = (from: number, to: number) => {
    for (let i = from; i <= to; i += 1) where[path[i]] = i;
  };
  reindex(0, path.length - 1);

  const shakes = size * size * 24;
  for (let n = 0; n < shakes; n += 1) {
    const fromTail = rnd() < 0.5;
    const end = fromTail ? path[path.length - 1] : path[0];
    const options = neighbours(end, size);
    const q = options[Math.floor(rnd() * options.length)];
    const j = where[q];

    if (fromTail) {
      // 꼬리와 q 를 잇고, q 뒤쪽을 뒤집어 그 다음 칸이 새 꼬리가 되게 한다
      if (j >= path.length - 2) continue;
      let lo = j + 1;
      let hi = path.length - 1;
      while (lo < hi) {
        [path[lo], path[hi]] = [path[hi], path[lo]];
        lo += 1;
        hi -= 1;
      }
      reindex(j + 1, path.length - 1);
    } else {
      if (j <= 1) continue;
      let lo = 0;
      let hi = j - 1;
      while (lo < hi) {
        [path[lo], path[hi]] = [path[hi], path[lo]];
        lo += 1;
        hi -= 1;
      }
      reindex(0, j - 1);
    }
  }

  return path;
}

/**
 * 길 하나를 토막 내어 문제로 만든다.
 *
 * 토막마다 최소 두 칸은 줘야 한다. 한 칸짜리는 두 끝이 같은 칸이라 문제가 안 된다.
 * 남는 칸은 무작위로 나눠 줘서 길이가 제각각이 되게 한다.
 */
export function makePuzzle(size: number, count: number, seed: number): Puzzle {
  const rnd = makeRandom(seed);
  const path = hamiltonian(size, rnd);
  const cells = path.length;
  const pairs = Math.min(count, Math.floor(cells / 2));

  const lengths = new Array<number>(pairs).fill(2);
  for (let spare = cells - pairs * 2; spare > 0; spare -= 1) {
    lengths[Math.floor(rnd() * pairs)] += 1;
  }

  const solution: number[][] = [];
  let at = 0;
  for (const len of lengths) {
    solution.push(path.slice(at, at + len));
    at += len;
  }

  return {
    size,
    pairs: solution.map((seg) => ({ a: seg[0], b: seg[seg.length - 1] })),
    solution,
  };
}

/** 판이 커지고 쌍이 늘어난다. 너무 커지면 손가락으로 못 그린다. */
export function stageOf(level: number): { size: number; count: number } {
  const size = Math.min(7, 5 + Math.floor(level / 5));
  const count = Math.min(size, 4 + Math.floor(level / 3));
  return { size, count };
}
