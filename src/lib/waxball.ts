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
  /** 누르는 방향(라디안)과 깊이(0~1) */
  pressAngle: number;
  pressDepth: number;
  /** 끌어당기는 방향과 세기(0~1) */
  stretchAngle: number;
  stretch: number;
}

export const restingSquish = (): Squish => ({
  pressAngle: 0,
  pressDepth: 0,
  stretchAngle: 0,
  stretch: 0,
});

/** -π..π 로 접은 각도 차 */
function angleGap(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * 어느 각도에서 공 표면이 얼마나 멀리 있는지.
 *
 * 누른 자리는 쑥 들어가고, 들어간 만큼 다른 데가 부푼다.
 * 그 부푸는 몫이 없으면 그냥 이가 빠진 원이라 말랑해 보이지 않는다.
 */
export function blobRadius(theta: number, s: Squish): number {
  const near = angleGap(theta, s.pressAngle);
  const dent = s.pressDepth * 0.55 * Math.exp(-(near * near) / (2 * 0.5 * 0.5));
  const bulge = s.pressDepth * 0.2 * (1 - Math.exp(-(near * near) / (2 * 1.1 * 1.1)));

  // 끄는 쪽으로만 뾰족하게 딸려 나온다.
  // 코사인으로 퍼뜨리면 반쪽이 통째로 밀려서 뭉툭하게 잘린 것처럼 보인다.
  const away = angleGap(theta, s.stretchAngle);
  const stretch = s.stretch * 0.72 * Math.exp(-(away * away) / (2 * 0.6 * 0.6));

  return Math.max(0.25, 1 - dent + bulge + stretch);
}

/** 손을 떼면 제자리로 돌아온다 */
export function relax(s: Squish, dt: number): Squish {
  const k = Math.exp(-dt * 7);
  return { ...s, pressDepth: s.pressDepth * k, stretch: s.stretch * k };
}
