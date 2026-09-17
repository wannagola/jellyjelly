import { audio, noiseBuffer } from "./audio";

/**
 * 도토리 받기에 쓰는 그림과 소리.
 *
 * 화면 파일에 두면 빠른 새로고침이 깨져서 따로 뒀다.
 * 크기는 전부 r(기준 반지름) 배수로만 적는다. 화면 폭이 달라져도 같은 그림이 나온다.
 */

export type Falling = "acorn" | "leaf" | "burr";

const OAK = "#B5803F";
const OAK_DARK = "#7C4F24";
const OAK_CAP = "#6B4420";
const GINKGO = "#E8B830";
const GINKGO_DARK = "#C79612";
const BURR = "#8FA355";
const BURR_DARK = "#5E6E34";

const FUR = "#C1793F";
const FUR_DARK = "#9C5B28";
const BELLY = "#EBD2B4";

const CANE = "#D9A860";
const CANE_DARK = "#A9742F";
const CANE_DEEP = "#6E4517";

/* ---------- 그림 ---------- */

/** 도토리 한 알. 깍정이가 있어야 도토리로 읽힌다. */
function drawAcorn(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = OAK;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.62, r * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();

  // 아래로 갈수록 좁아지는 끝
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, r * 0.82);
  ctx.quadraticCurveTo(0, r * 1.3, r * 0.2, r * 0.82);
  ctx.fill();

  ctx.fillStyle = OAK_CAP;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.34, r * 0.72, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-r * 0.08, -r * 0.92, r * 0.16, r * 0.34);

  ctx.fillStyle = "rgba(255,255,255,.34)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.22, r * 0.18, r * 0.16, r * 0.26, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = OAK_DARK;
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.34, r * 0.72, r * 0.42, 0, 0, Math.PI);
  ctx.stroke();
}

/** 은행잎. 부채꼴에 가운데가 갈라진 모양이면 그걸로 충분하다. */
function drawLeaf(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = GINKGO;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.72);
  ctx.quadraticCurveTo(-r * 1.05, r * 0.2, -r * 0.78, -r * 0.62);
  ctx.quadraticCurveTo(-r * 0.3, -r * 0.34, -r * 0.06, -r * 0.66);
  ctx.lineTo(0, -r * 0.34);
  ctx.lineTo(r * 0.06, -r * 0.66);
  ctx.quadraticCurveTo(r * 0.3, -r * 0.34, r * 0.78, -r * 0.62);
  ctx.quadraticCurveTo(r * 1.05, r * 0.2, 0, r * 0.72);
  ctx.closePath();
  ctx.fill();

  // 잎맥은 부채살처럼 퍼진다
  ctx.strokeStyle = GINKGO_DARK;
  ctx.lineWidth = r * 0.05;
  ctx.lineCap = "round";
  for (const a of [-1.05, -0.62, -0.2, 0.2, 0.62, 1.05]) {
    ctx.beginPath();
    ctx.moveTo(0, r * 0.66);
    ctx.lineTo(Math.sin(a) * r * 0.82, r * 0.66 - Math.cos(a) * r * 1.2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(0, r * 0.7);
  ctx.lineTo(0, r * 1.15);
  ctx.stroke();
}

/** 밤송이. 가시가 보여야 피해야 할 것으로 읽힌다. */
function drawBurr(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeStyle = BURR_DARK;
  ctx.lineWidth = r * 0.11;
  ctx.lineCap = "round";
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
    ctx.lineTo(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02);
    ctx.stroke();
  }
  ctx.fillStyle = BURR;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.26)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.22, r * 0.18, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFalling(
  ctx: CanvasRenderingContext2D,
  kind: Falling,
  x: number,
  y: number,
  r: number,
  rotate: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  if (kind === "acorn") drawAcorn(ctx, r);
  else if (kind === "leaf") drawLeaf(ctx, r);
  else drawBurr(ctx, r);
  ctx.restore();
}

/**
 * 바구니 치수. 다람쥐 기준점(발밑)에서 r 배수로 잰다.
 *
 * 그리는 쪽과 받았는지 따지는 쪽이 이 숫자 하나를 같이 본다. 따로 적어두면
 * 언젠가 한쪽만 고쳐서, 바구니 밖에 떨어졌는데 받아지거나 그 반대가 된다.
 */
const BASKET = {
  /** 아가리가 발밑에서 얼마나 위인가. 귀가 가리지 않을 만큼은 들어야 한다. */
  lift: 2.4,
  /** 아가리 반폭 */
  half: 0.95,
  /** 아가리 타원의 세로 반지름 - 원근을 주는 만큼 */
  rim: 0.26,
  /** 아가리에서 바닥까지 */
  deep: 0.6,
};

/** 바구니 아가리가 화면 어디에 있나. 받았는지는 이걸로만 따진다. */
export function basketMouth(x: number, groundY: number, r: number) {
  return { x, y: groundY - r * BASKET.lift, half: r * BASKET.half };
}

/**
 * 다람쥐.
 *
 * 바구니를 머리 위로 들고 받는다. 받는 자리가 그림으로 딱 정해져 있어서,
 * 어디로 받는지 설명할 필요가 없고 빗맞았을 때도 왜 못 받았는지가 보인다.
 * 꼬리는 몸보다 커야 다람쥐로 읽힌다.
 */
export function drawSquirrel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  /** -1~1. 뛰어가는 쪽으로 기운다 */
  lean: number,
  /** 0~1. 받은 직후 잠깐 1 이 된다 */
  joy: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean * 0.16);

  // 꼬리 - 몸 뒤에서 크게 말린다
  ctx.fillStyle = FUR_DARK;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5 * Math.sign(lean || 1), r * 0.5);
  ctx.bezierCurveTo(-r * 1.9, r * 0.4, -r * 1.7, -r * 1.5, -r * 0.55, -r * 1.05);
  ctx.bezierCurveTo(-r * 1.15, -r * 1.25, -r * 1.2, r * 0.05, -r * 0.35, r * 0.55);
  ctx.closePath();
  ctx.fill();

  // 몸
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.28, r * 0.66, r * 0.74, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BELLY;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.42, r * 0.4, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 팔 - 바구니 양옆을 붙잡고 머리 위로 들어 올린다
  const grip = -r * (BASKET.lift - BASKET.deep * 0.45);
  ctx.strokeStyle = FUR;
  ctx.lineWidth = r * 0.24;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.42, r * 0.18);
    ctx.quadraticCurveTo(side * r * 1.02, -r * 0.55, side * r * BASKET.half * 0.88, grip);
    ctx.stroke();
  }

  // 머리
  const head = -r * 0.62;
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.arc(0, head, r * 0.52, 0, Math.PI * 2);
  ctx.fill();

  // 귀
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * r * 0.36, head - r * 0.42, r * 0.17, r * 0.24, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 눈 - 받은 직후엔 웃는다
  ctx.strokeStyle = "#4A3323";
  ctx.fillStyle = "#4A3323";
  for (const side of [-1, 1]) {
    const ex = side * r * 0.2;
    const ey = head - r * 0.04;
    if (joy > 0.35) {
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.arc(ex, ey + r * 0.05, r * 0.13, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.1, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex - r * 0.035, ey - r * 0.04, r * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4A3323";
    }
  }

  // 코와 볼
  ctx.beginPath();
  ctx.ellipse(0, head + r * 0.2, r * 0.07, r * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(226, 150, 170, .35)";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * r * 0.36, head + r * 0.18, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBasket(ctx, r, joy);
  // 붙잡은 앞발은 바구니 위에 얹혀야 든 것으로 보인다
  ctx.fillStyle = FUR;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * r * BASKET.half * 0.9, grip, r * 0.16, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** 들고 있는 바구니. 아가리가 곧 받는 자리라서 테두리를 또렷하게 둔다. */
function drawBasket(ctx: CanvasRenderingContext2D, r: number, joy: number) {
  const cy = -r * BASKET.lift;
  const half = r * BASKET.half;
  const rim = r * BASKET.rim;
  const deep = r * BASKET.deep;
  const foot = half * 0.72;

  // 아가리 안쪽. 구멍이 보여야 들어가는 자리로 읽힌다.
  ctx.fillStyle = CANE_DEEP;
  ctx.beginPath();
  ctx.ellipse(0, cy, half, rim, 0, 0, Math.PI * 2);
  ctx.fill();

  // 몸통 - 아래로 좁아지다 바닥에서 둥글게 닫힌다
  ctx.fillStyle = CANE;
  ctx.beginPath();
  ctx.moveTo(-half, cy);
  ctx.lineTo(-foot, cy + deep);
  ctx.quadraticCurveTo(0, cy + deep + rim * 1.4, foot, cy + deep);
  ctx.lineTo(half, cy);
  ctx.closePath();
  ctx.fill();

  // 엮은 결. 가로 띠와 세로 살이 있어야 바구니지 그냥 통이 아니다.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = CANE_DARK;
  ctx.lineWidth = r * 0.055;
  for (const t of [0.3, 0.62, 0.92]) {
    const y = cy + deep * t;
    const wide = half + (foot - half) * t;
    ctx.beginPath();
    ctx.ellipse(0, y, wide, rim * 0.72, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.lineWidth = r * 0.042;
  for (const u of [-0.72, -0.26, 0.26, 0.72]) {
    ctx.beginPath();
    ctx.moveTo(half * u, cy);
    ctx.lineTo(foot * u, cy + deep + rim);
    ctx.stroke();
  }
  ctx.restore();

  // 테두리 - 앞쪽만 굵게 둘러 아가리를 또렷하게
  ctx.strokeStyle = CANE_DARK;
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.ellipse(0, cy, half, rim, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 받은 직후엔 아가리가 한 번 환해진다. 방금 여기로 들어갔다는 표시다.
  if (joy > 0.05) {
    ctx.strokeStyle = `rgba(255, 236, 178, ${joy * 0.9})`;
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.ellipse(0, cy, half * (1 + (1 - joy) * 0.16), rim * (1 + (1 - joy) * 0.16), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ---------- 소리 ---------- */

/**
 * 도토리를 받는 소리.
 *
 * 나무 열매는 '통' 이 아니라 '톡' 이다. 울림이 거의 없고 아주 짧다.
 * 삼각파를 20ms 만에 꺼버리고, 맞부딪힌 기척으로 짧은 잡음 한 톨만 얹는다.
 * 점수가 이어질수록 음을 올려서, 연달아 받으면 저절로 가락이 된다.
 */
export function playCatch(streak: number): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime;
  // 5음 음계 안에서만 올라간다. 아무 음이나 쓰면 연타가 소음이 된다.
  const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  const semitone = steps[Math.min(steps.length - 1, streak)];
  const freq = 523.25 * 2 ** (semitone / 12);

  const out = ac.createGain();
  out.gain.value = 0.6;
  out.connect(ac.destination);

  for (const [ratio, gain, len] of [
    [1, 1, 0.16],
    [2.76, 0.3, 0.07],
  ] as const) {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq * ratio;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.17 * gain, at + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + len + 0.02);
  }

  const tick = ac.createBufferSource();
  tick.buffer = noiseBuffer(ac);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2400;
  band.Q.value = 1.4;
  const tickEnv = ac.createGain();
  tickEnv.gain.setValueAtTime(0.045, at);
  tickEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.02);
  tick.connect(band).connect(tickEnv).connect(out);
  tick.start(at);
  tick.stop(at + 0.05);
}

/** 은행잎을 받는 소리. 도토리보다 가볍고 길게 반짝인다. */
export function playLeaf(): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 0.5;
  out.connect(ac.destination);

  for (const [freq, delay] of [
    [1046.5, 0],
    [1568, 0.06],
    [2093, 0.12],
  ] as const) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, at + delay);
    env.gain.exponentialRampToValueAtTime(0.1, at + delay + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + delay + 0.3);
    osc.connect(env).connect(out);
    osc.start(at + delay);
    osc.stop(at + delay + 0.35);
  }
}

/** 밤송이에 찔리는 소리. 짧고 거칠게, 그리고 바닥이 한 번 꺼진다. */
export function playOuch(): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 0.7;
  out.connect(ac.destination);

  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1200;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 5000;
  const env = ac.createGain();
  env.gain.setValueAtTime(0.22, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
  src.connect(hp).connect(lp).connect(env).connect(out);
  src.start(at);
  src.stop(at + 0.14);

  const drop = ac.createOscillator();
  drop.type = "sawtooth";
  drop.frequency.setValueAtTime(320, at);
  drop.frequency.exponentialRampToValueAtTime(90, at + 0.26);
  const soft = ac.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 900;
  const dropEnv = ac.createGain();
  dropEnv.gain.setValueAtTime(0.0001, at);
  dropEnv.gain.exponentialRampToValueAtTime(0.14, at + 0.01);
  dropEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
  drop.connect(soft).connect(dropEnv).connect(out);
  drop.start(at);
  drop.stop(at + 0.34);
}

/** 놓쳤을 때. 바닥에 툭 떨어지는 기척만. */
export function playMiss(): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(190, at);
  osc.frequency.exponentialRampToValueAtTime(96, at + 0.1);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(0.07, at + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  osc.connect(env).connect(ac.destination);
  osc.start(at);
  osc.stop(at + 0.2);
}
