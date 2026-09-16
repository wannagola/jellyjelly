const TRUNK = "#a99db3";

/** 코끼리 그리기. 화면 파일에 두면 빠른 새로고침이 깨져서 따로 뒀다. */

/**
 * 코. 굵기가 변해야 코처럼 보여서, 선을 긋지 않고
 * 곡선을 따라 양옆으로 벌린 다각형을 채운다.
 *
 * tip 을 주면 코끝이 그리로 뻗는다. 젤리를 주울 때 쓴다.
 * 중간 제어점도 같이 끌려가야 뻗는 팔처럼 보인다.
 */
export function drawTrunk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  headR: number,
  swing: number,
  tip?: { x: number; y: number },
) {
  const rest = { x: x + headR * (0.68 + swing * 1.4), y: y + headR * 1.52 };
  const end = tip ?? rest;

  const p0 = { x, y };
  const p1 = { x: x + headR * (0.04 + swing * 0.3), y: y + headR * 0.72 };
  const p2 = tip
    ? { x: (x + end.x) / 2 + headR * 0.1, y: y + (end.y - y) * 0.55 + headR * 0.35 }
    : { x: x + headR * (0.26 + swing * 0.9), y: y + headR * 1.42 };

  const spine: { x: number; y: number; w: number }[] = [];
  const STEPS = 26;
  for (let i = 0; i <= STEPS; i += 1) {
    const t = i / STEPS;
    const u = 1 - t;
    spine.push({
      x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * end.x,
      y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * end.y,
      w: headR * (0.34 - 0.24 * t ** 0.8),
    });
  }

  const side = (i: number, sign: number) => {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(spine.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return {
      x: spine[i].x - sign * ((b.y - a.y) / len) * spine[i].w,
      y: spine[i].y + sign * ((b.x - a.x) / len) * spine[i].w,
    };
  };

  ctx.beginPath();
  for (let i = 0; i < spine.length; i += 1) {
    const p = side(i, 1);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let i = spine.length - 1; i >= 0; i -= 1) {
    const p = side(i, -1);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = TRUNK;
  ctx.fill();

  ctx.strokeStyle = "rgba(90, 78, 100, 0.16)";
  ctx.lineWidth = Math.max(1, headR * 0.028);
  for (let i = 6; i < spine.length - 4; i += 4) {
    const a = side(i, 1);
    const b = side(i, -1);
    ctx.beginPath();
    ctx.moveTo(a.x + (b.x - a.x) * 0.15, a.y + (b.y - a.y) * 0.15);
    ctx.lineTo(a.x + (b.x - a.x) * 0.85, a.y + (b.y - a.y) * 0.85);
    ctx.stroke();
  }

  return spine[spine.length - 1];
}

/** 바닥에 굴러다니는 젤리 한 알 */
export function drawFloorJelly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  kind: "bear" | "cube" | "ring",
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;

  if (kind === "ring") {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
  } else if (kind === "cube") {
    const r = size * 0.22;
    const s = size * 0.46;
    ctx.beginPath();
    ctx.roundRect(-s, -s, s * 2, s * 2, r);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(-size * 0.28, -size * 0.34, size * 0.17, 0, Math.PI * 2);
    ctx.arc(size * 0.28, -size * 0.34, size * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, size * 0.05, size * 0.42, size * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-size * 0.14, -size * 0.18, size * 0.13, size * 0.08, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
