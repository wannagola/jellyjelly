import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { playHit, playTrumpet } from "../lib/drum";
import { useSettings } from "../lib/settings";
import { SquishVoice } from "../lib/squish";
import { type Squish, blobRadius, hold, pressAt, relax, restingSquish } from "../lib/waxball";

interface Ripple {
  x: number;
  y: number;
  r: number;
  strength: number;
}

const SKIN = "#b9aec4";
const SKIN_DARK = "#8f8299";
const BELLY = "#cfc4d6";
const TRUNK = "#a99db3";
/** 배가 늘어나도 화면 밖으로 안 나가게 */
const MAX_REACH = 1.5;

export function TummyScreen() {
  const settings = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hits, setHits] = useState(0);

  const ripples = useRef<Ripple[]>([]);
  const squish = useRef<Squish>(restingSquish());
  const blink = useRef(0);
  const lastHitAt = useRef(0);
  const voice = useRef(new SquishVoice());
  const muted = useRef(false);
  const down = useRef(new Set<number>());
  const moved = useRef(0);

  useEffect(() => {
    muted.current = Boolean(settings?.muted);
  }, [settings?.muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stroke = voice.current;

    let raf = 0;
    let prev = performance.now();
    let w = 0;
    let h = 0;
    let bx = 0;
    let by = 0;
    let radius = 0;

    const fit = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const box = canvas.getBoundingClientRect();
      w = box.width;
      h = box.height;
      bx = w / 2;
      by = h * 0.62;
      radius = Math.min(w / 2, h * 0.38) / MAX_REACH;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);

    const local = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return { x: (e.clientX - box.left - bx) / radius, y: (e.clientY - box.top - by) / radius };
    };

    const onDown = (e: PointerEvent) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // 이미 사라진 포인터면 그냥 넘어간다
      }
      down.current.add(e.pointerId);
      moved.current = 0;

      const p = local(e);
      const reach = Math.hypot(p.x, p.y);
      if (reach > 1.06) return;

      // 연타하면 손이 덜 올라가서 약해지고, 쉬었다 치면 세진다
      const now = performance.now();
      const gap = (now - lastHitAt.current) / 1000;
      lastHitAt.current = now;
      const strength = 0.5 + Math.min(1, gap / 0.55) * 0.5;

      ripples.current.push({ x: p.x, y: p.y, r: 0, strength });
      const poke = pressAt(reach, 0.62 * strength);
      squish.current = hold(squish.current, {
        pressAngle: Math.atan2(p.y, p.x),
        pressDepth: poke.dent,
        squash: poke.squash,
      });
      blink.current = 1;

      if (!muted.current) {
        playHit(Math.min(1, reach), strength);
        // 가끔 신이 나서 한 번 운다
        if (Math.random() < 0.055) setTimeout(playTrumpet, 190);
      }
      navigator.vibrate?.(Math.round(8 + strength * 14));
      setHits((n) => n + 1);
    };

    const onMove = (e: PointerEvent) => {
      if (!down.current.has(e.pointerId)) return;
      const p = local(e);
      const reach = Math.hypot(p.x, p.y);
      moved.current += 1;
      if (reach > 1.06) return;

      // 문지르는 건 치는 게 아니다. 소리도 모양도 부드럽게만.
      if (moved.current > 2) {
        if (!muted.current) {
          stroke.start();
          stroke.update(0.35);
        }
        const rub = pressAt(reach, 0.3);
        squish.current = hold(squish.current, {
          pressAngle: Math.atan2(p.y, p.x),
          pressDepth: rub.dent,
          squash: rub.squash,
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      down.current.delete(e.pointerId);
      if (down.current.size === 0) stroke.stop();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    /* ---------- 그리기 ---------- */

    const bellyPath = () => {
      ctx.beginPath();
      const STEPS = 130;
      for (let i = 0; i <= STEPS; i += 1) {
        const a = (i / STEPS) * Math.PI * 2;
        const r = blobRadius(a, squish.current) * radius;
        const x = bx + Math.cos(a) * r;
        const y = by + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      if (down.current.size === 0) squish.current = relax(squish.current, dt);
      blink.current = Math.max(0, blink.current - dt * 3.2);

      // 파동은 퍼지면서 옅어진다
      for (const wave of ripples.current) wave.r += dt * 2.1;
      ripples.current = ripples.current.filter((wave) => wave.r < 2.2);

      ctx.clearRect(0, 0, w, h);

      const headY = by - radius * 1.12;
      const headR = radius * 0.5;

      // 귀
      ctx.fillStyle = SKIN_DARK;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          bx + side * headR * 1.15,
          headY + headR * 0.1,
          headR * 0.72,
          headR * 0.95,
          side * 0.35,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // 발
      ctx.fillStyle = SKIN_DARK;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          bx + side * radius * 0.56,
          by + radius * 0.95,
          radius * 0.26,
          radius * 0.17,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // 배
      bellyPath();
      const skin = ctx.createRadialGradient(
        bx - radius * 0.3,
        by - radius * 0.35,
        radius * 0.1,
        bx,
        by,
        radius * 1.15,
      );
      skin.addColorStop(0, "#e5dced");
      skin.addColorStop(0.55, BELLY);
      skin.addColorStop(1, SKIN_DARK);
      ctx.fillStyle = skin;
      ctx.fill();

      // 배 위를 퍼지는 파동
      ctx.save();
      bellyPath();
      ctx.clip();
      for (const wave of ripples.current) {
        const fade = Math.max(0, 1 - wave.r / 2.2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.72 * fade * fade * wave.strength})`;
        ctx.lineWidth = radius * 0.05 * fade + 1;
        ctx.beginPath();
        ctx.arc(bx + wave.x * radius, by + wave.y * radius, wave.r * radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 배꼽
      ctx.fillStyle = "rgba(143, 130, 153, 0.35)";
      ctx.beginPath();
      ctx.ellipse(bx, by + radius * 0.1, radius * 0.07, radius * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 머리
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.arc(bx, headY, headR, 0, Math.PI * 2);
      ctx.fill();

      // 코는 얼굴에 붙어 있다. 머리 밑에서 따로 나오면 꼬리처럼 보인다.
      // 눈 바로 아래에서 시작해 얼굴 위로 내려온다. 배를 칠 때마다 휘청인다.
      const swing = squish.current.pressDepth * 0.5 + Math.sin(now / 900) * 0.06;
      drawTrunk(ctx, bx, headY + headR * 0.04, headR, swing);

      // 눈. 칠 때마다 질끈 감는다.
      const lid = blink.current;
      ctx.fillStyle = "#3b2f45";
      for (const side of [-1, 1]) {
        const ex = bx + side * headR * 0.36;
        const ey = headY - headR * 0.12;
        if (lid > 0.45) {
          ctx.lineWidth = headR * 0.07;
          ctx.strokeStyle = "#3b2f45";
          ctx.beginPath();
          ctx.arc(ex, ey + headR * 0.05, headR * 0.14, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.ellipse(ex, ey, headR * 0.09, headR * 0.12 * (1 - lid * 0.6), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      stroke.stop();
    };
  }, []);

  return (
    <>
      <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
        <Link to="/" className="justify-self-start text-base text-ink-soft">
          ‹ 선반
        </Link>
        <h1 className="font-display text-lg">코끼리 배</h1>
        <span className="justify-self-end text-xs text-ink-faint tabular-nums">
          {hits > 0 ? `${hits}번` : ""}
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pb-4">
        <canvas
          ref={canvasRef}
          className="aspect-[1/1.12] w-full max-w-[420px] touch-none select-none"
        />
        <p className="mt-1 h-5 text-sm text-ink-soft">
          가운데는 낮게, 가장자리는 높게 울려요
        </p>
      </main>
    </>
  );
}

/**
 * 코. 굵기가 변해야 코처럼 보여서, 선을 긋지 않고
 * 곡선을 따라 양옆으로 벌린 다각형을 채운다.
 *
 * 길이는 얼굴 크기를 기준으로 잡는다. 몸통까지 늘어뜨리면 코가 아니라
 * 밧줄처럼 보인다. 끝만 살짝 말아 올린다.
 */
function drawTrunk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  headR: number,
  swing: number,
) {
  const p0 = { x, y };
  const p1 = { x: x + headR * (0.04 + swing * 0.3), y: y + headR * 0.66 };
  const p2 = { x: x + headR * (0.26 + swing * 0.9), y: y + headR * 1.2 };
  const p3 = { x: x + headR * (0.66 + swing * 1.4), y: y + headR * 1.26 };

  const spine: { x: number; y: number; w: number }[] = [];
  const STEPS = 24;
  for (let i = 0; i <= STEPS; i += 1) {
    const t = i / STEPS;
    const u = 1 - t;
    spine.push({
      x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
      y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y,
      w: headR * (0.3 - 0.21 * t ** 0.8),
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

  // 코 주름. 촘촘하면 목도리처럼 보인다.
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
}
