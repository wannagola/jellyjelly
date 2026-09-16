/**
 * 왁뿌볼의 모양.
 *
 * 좌표는 전부 공 반지름을 1로 둔 단위계다. 화면 크기를 몰라도 되고,
 * 폰 크기가 달라도 같은 모양이 나온다. 그리는 쪽에서 반지름만 곱하면 된다.
 */

/**
 * 왁스에 파인 자국 하나.
 *
 * 처음엔 조각으로 미리 나눠뒀는데, 금이 가기도 전에 갈라진 선이 다 보여서
 * 과녁처럼 보였다. 왁뿌볼은 매끈한 채로 시작해서 누른 자리부터 깨져야 한다.
 * 그래서 왁스는 통째로 그리고, 누른 자리마다 이 자국으로 파낸다.
 */
export interface Chip {
  x: number;
  y: number;
  /** 가장자리 반지름을 각도별로. 들쭉날쭉해야 깨진 자국처럼 보인다. */
  edge: number[];
  r: number;
  /** 자국에서 왁스 쪽으로 뻗는 실금 */
  cracks: { angle: number; length: number }[];
  /** 갓 깨진 자국은 잠깐 밝다 */
  age: number;
}

function makeRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const EDGE_STEPS = 18;

/** 누른 자리에 자국을 하나 만든다. 좌표는 공 반지름을 1로 둔 단위계. */
export function makeChip(x: number, y: number, radius: number, rnd = Math.random): Chip {
  const edge = Array.from({ length: EDGE_STEPS }, () => 0.62 + rnd() * 0.72);
  // 이음매가 벌어지지 않게 첫 값으로 닫는다
  edge.push(edge[0]);

  const cracks = Array.from({ length: 3 + Math.floor(rnd() * 3) }, () => ({
    angle: rnd() * Math.PI * 2,
    length: radius * (0.5 + rnd() * 1.1),
  }));

  return { x, y, edge, r: radius, cracks, age: 0 };
}

/** 자국 가장자리의 반지름 */
export function chipRadiusAt(chip: Chip, angle: number): number {
  const t = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const pos = (t / (Math.PI * 2)) * EDGE_STEPS;
  const i = Math.floor(pos);
  const frac = pos - i;
  const a = chip.edge[i];
  const b = chip.edge[i + 1];
  return chip.r * (a + (b - a) * frac);
}

/**
 * 왁스가 얼마나 벗겨졌는지 (0~1).
 * 격자로 찍어보고 자국 안에 든 비율을 센다. 넓이를 정확히 구할 필요는 없다.
 */
export function peeled(chips: Chip[], grid = 26): number {
  let inside = 0;
  let gone = 0;
  for (let gy = 0; gy < grid; gy += 1) {
    const y = -1 + ((gy + 0.5) / grid) * 2;
    for (let gx = 0; gx < grid; gx += 1) {
      const x = -1 + ((gx + 0.5) / grid) * 2;
      if (x * x + y * y > 1) continue;
      inside += 1;
      for (const chip of chips) {
        const dx = x - chip.x;
        const dy = y - chip.y;
        const d = Math.hypot(dx, dy);
        if (d <= chipRadiusAt(chip, Math.atan2(dy, dx))) {
          gone += 1;
          break;
        }
      }
    }
  }
  return inside === 0 ? 1 : gone / inside;
}

export { makeRandom };

export interface Squish {
  /** 누르는 방향과 깊이. 손을 떼면 되튀느라 잠깐 음수가 된다. */
  pressAngle: number;
  pressDepth: number;
  pressVel: number;
  /** 한복판을 눌렀을 때 공 전체가 납작해지는 몫 */
  squash: number;
  squashVel: number;
  /** 끌어당기는 방향과 세기 */
  stretchAngle: number;
  stretch: number;
  stretchVel: number;
}

export const restingSquish = (): Squish => ({
  pressAngle: 0,
  pressDepth: 0,
  pressVel: 0,
  squash: 0,
  squashVel: 0,
  stretchAngle: 0,
  stretch: 0,
  stretchVel: 0,
});

/** -π..π 로 접은 각도 차 */
function angleGap(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** 손가락이 닿는 자리의 폭 */
const DENT_WIDTH = 0.72;

/**
 * 어느 각도에서 표면이 얼마나 멀리 있는지.
 *
 * 누른 자리만 파면 이가 빠진 원처럼 보인다. 실제로 말랑한 걸 누르면
 * 눌린 자리 바로 옆이 도톰하게 부푼다. 밀려난 살이 갈 데가 거기밖에 없기 때문이다.
 * 가운데가 양수고 둘레가 음수인 모자 모양 함수를 쓰면 그게 한 번에 나온다.
 */
export function blobRadius(theta: number, s: Squish): number {
  const u = angleGap(theta, s.pressAngle) / DENT_WIDTH;

  // 손가락 바닥은 평평하다. 뾰족한 산으로 파면 V 자로 갈라진 것처럼 보인다.
  // 네제곱을 쓰면 가운데가 넓고 평평한 봉우리가 된다.
  const core = Math.exp(-(u * u * u * u) * 0.8);
  // 밀려난 살이 쌓이는 둘레. 홈에서 조금 떨어진 자리에 봉우리를 따로 세운다.
  const shoulder = Math.exp(-(((Math.abs(u) - 1.45) / 0.72) ** 2));
  const dent = s.pressDepth * (0.5 * core - 0.24 * shoulder);

  // 끄는 쪽으로만 뾰족하게 딸려 나온다.
  // 코사인으로 퍼뜨리면 반쪽이 통째로 밀려서 뭉툭하게 잘린 것처럼 보인다.
  const away = angleGap(theta, s.stretchAngle);
  const stretch = s.stretch * 0.72 * Math.exp(-(away * away) / (2 * 0.6 * 0.6));

  // 한복판을 누르면 파이는 게 아니라 공 전체가 조금 납작해진다
  return Math.max(0.22, 1 - dent - s.squash * 0.13 + stretch);
}

/**
 * 손을 떼면 제자리로. 그냥 사그라들게 하면 공기가 빠지는 것 같다.
 * 용수철로 되돌리면 한 번 지나쳤다가 돌아와서 탱글하게 보인다.
 */
const STIFFNESS = 210;
const DAMPING = 2 * 0.52 * Math.sqrt(STIFFNESS);

export function relax(s: Squish, dt: number): Squish {
  const step = (x: number, v: number) => {
    const next = v + (-STIFFNESS * x - DAMPING * v) * dt;
    return { x: x + next * dt, v: next };
  };
  const press = step(s.pressDepth, s.pressVel);
  const pull = step(s.stretch, s.stretchVel);
  const flat = step(s.squash, s.squashVel);
  return {
    ...s,
    pressDepth: press.x,
    pressVel: press.v,
    stretch: pull.x,
    stretchVel: pull.v,
    squash: flat.x,
    squashVel: flat.v,
  };
}

/** 손가락이 닿아 있는 동안은 용수철을 끄고 값을 바로 밀어 넣는다 */
export function hold(
  s: Squish,
  next: {
    pressAngle: number;
    pressDepth: number;
    squash?: number;
    stretchAngle?: number;
    stretch?: number;
  },
): Squish {
  return {
    pressAngle: next.pressAngle,
    pressDepth: next.pressDepth,
    pressVel: 0,
    squash: next.squash ?? 0,
    squashVel: 0,
    stretchAngle: next.stretchAngle ?? s.stretchAngle,
    stretch: next.stretch ?? s.stretch,
    stretchVel: 0,
  };
}

/**
 * 손가락이 어디를 짚었는지에 따라 홈과 납작함을 나눠 준다.
 * 가장자리를 누르면 그 자리가 파이고, 한복판을 누르면 파일 방향이 없으니
 * 공 전체가 눌린다. 가운데를 눌렀는데 옆구리가 V 자로 파이면 가짜로 보인다.
 */
export function pressAt(reach: number, strength: number) {
  const rho = Math.min(1, Math.max(0, reach));
  return {
    dent: strength * rho ** 1.2,
    squash: strength * (1 - rho) ** 1.4,
  };
}
