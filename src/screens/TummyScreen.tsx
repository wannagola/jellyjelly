import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { playHit, playTrumpet } from "../lib/drum";
import { JELLY_COLORS } from "../lib/jelly";
import type { JellyColor } from "../data/types";
import { useSettings } from "../lib/settings";
import { drawFloorJelly, drawTrunk } from "../lib/elephant";
import { SquishVoice } from "../lib/squish";
import { type Squish, blobRadius, hold, pressAt, relax, restingSquish } from "../lib/waxball";

interface Ripple {
  x: number;
  y: number;
  r: number;
  strength: number;
}

interface FloorJelly {
  id: number;
  /** 배 중심을 기준으로 한 자리 (반지름을 1로 둔 단위계) */
  x: number;
  y: number;
  color: JellyColor;
  kind: "bear" | "cube" | "ring";
  /** 떨어지는 중이면 0보다 크다 */
  drop: number;
}

/** 젤리를 줍는 동작. 뻗고, 올리고, 먹고, 외친다. */
interface Eating {
  phase: "reach" | "lift" | "cheer";
  t: number;
  jelly: FloorJelly;
}

const SKIN = "#b9aec4";
const SKIN_DARK = "#8f8299";
const BELLY = "#cfc4d6";
const EAR_INNER = "#c8b9cf";
const COLORS: JellyColor[] = ["grape", "berry", "green", "orange", "lemon", "soda", "peach", "cola"];
const KINDS: FloorJelly["kind"][] = ["bear", "cube", "ring"];
/** 배가 늘어나도 화면 밖으로 안 나가게 */
const MAX_REACH = 1.5;
const FLOOR_COUNT = 4;

let jellySeq = 0;
function spawnJelly(slot: number): FloorJelly {
  jellySeq += 1;
  return {
    id: jellySeq,
    x: -0.9 + slot * 0.6 + (Math.random() - 0.5) * 0.18,
    y: 1.28 + (Math.random() - 0.5) * 0.08,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    kind: KINDS[Math.floor(Math.random() * KINDS.length)],
    drop: 1,
  };
}

export function TummyScreen() {
  const settings = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hits, setHits] = useState(0);
  const [eaten, setEaten] = useState(0);

  const ripples = useRef<Ripple[]>([]);
  const squish = useRef<Squish>(restingSquish());
  const jellies = useRef<FloorJelly[]>(
    Array.from({ length: FLOOR_COUNT }, (_, i) => spawnJelly(i)),
  );
  const eating = useRef<Eating | undefined>(undefined);
  const cheer = useRef(0);
  /** 방금 먹은 젤리 색. 야르 글씨가 그 색으로 나온다. */
  const cheerColor = useRef(JELLY_COLORS.grape);
  const blink = useRef(0);
  const flap = useRef(0);
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
      by = h * 0.55;
      radius = Math.min(w / 2, h * 0.34) / MAX_REACH;
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

    const headOf = () => ({ y: by - radius * 1.12, r: radius * 0.5 });
    const mouthOf = () => {
      const head = headOf();
      return { x: bx + head.r * 0.5, y: head.y + head.r * 1.05 };
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

      // 바닥 젤리가 먼저다. 배보다 아래에 있으니 헷갈릴 일도 없다.
      if (!eating.current) {
        const picked = jellies.current.find(
          (j) => j.drop <= 0 && Math.hypot(j.x - p.x, j.y - p.y) < 0.28,
        );
        if (picked) {
          eating.current = { phase: "reach", t: 0, jelly: picked };
          return;
        }
      }

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
      flap.current = strength;

      if (!muted.current) playHit(Math.min(1, reach), strength);
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

    /* ---------- 먹는 동작 ---------- */

    const stepEating = (dt: number) => {
      const act = eating.current;
      if (!act) return;
      const speed = act.phase === "cheer" ? 1.1 : act.phase === "reach" ? 2.6 : 2.2;
      act.t += dt * speed;
      if (act.t < 1) return;

      if (act.phase === "reach") {
        eating.current = { ...act, phase: "lift", t: 0 };
        return;
      }
      if (act.phase === "lift") {
        eating.current = { ...act, phase: "cheer", t: 0 };
        cheer.current = 1;
        cheerColor.current = JELLY_COLORS[act.jelly.color];
        flap.current = 1;
        blink.current = 1;
        if (!muted.current) playTrumpet();
        navigator.vibrate?.([12, 40, 18]);
        setEaten((n) => n + 1);
        // 먹은 자리에 새 젤리가 떨어진다
        const slot = jellies.current.findIndex((j) => j.id === act.jelly.id);
        if (slot >= 0) jellies.current[slot] = spawnJelly(slot);
        return;
      }
      eating.current = undefined;
    };

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
      flap.current = Math.max(0, flap.current - dt * 2.4);
      cheer.current = Math.max(0, cheer.current - dt * 0.85);
      for (const jelly of jellies.current) jelly.drop = Math.max(0, jelly.drop - dt * 2.4);
      stepEating(dt);

      for (const wave of ripples.current) wave.r += dt * 2.1;
      ripples.current = ripples.current.filter((wave) => wave.r < 2.2);

      ctx.clearRect(0, 0, w, h);

      const head = headOf();
      const headY = head.y;
      const headR = head.r;
      const mouth = mouthOf();

      // 귀. 부채처럼 위가 넓고 아래가 좁아야 코끼리 귀로 보인다.
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(bx + side * headR * 0.92, headY - headR * 0.1);
        ctx.rotate(side * (0.22 + flap.current * 0.16));
        ctx.scale(side, 1);

        ctx.fillStyle = SKIN_DARK;
        ctx.beginPath();
        ctx.moveTo(0, -headR * 0.72);
        ctx.bezierCurveTo(headR * 1.1, -headR * 0.95, headR * 1.25, headR * 0.5, headR * 0.5, headR * 0.92);
        ctx.bezierCurveTo(headR * 0.2, headR * 1.05, -headR * 0.05, headR * 0.6, 0, -headR * 0.72);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = EAR_INNER;
        ctx.beginPath();
        ctx.moveTo(headR * 0.1, -headR * 0.42);
        ctx.bezierCurveTo(headR * 0.78, -headR * 0.55, headR * 0.86, headR * 0.35, headR * 0.42, headR * 0.6);
        ctx.bezierCurveTo(headR * 0.24, headR * 0.66, headR * 0.06, headR * 0.34, headR * 0.1, -headR * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 발
      ctx.fillStyle = SKIN_DARK;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(bx + side * radius * 0.56, by + radius * 0.95, radius * 0.26, radius * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 배
      bellyPath();
      const skin = ctx.createRadialGradient(
        bx - radius * 0.3, by - radius * 0.35, radius * 0.1,
        bx, by, radius * 1.15,
      );
      skin.addColorStop(0, "#e5dced");
      skin.addColorStop(0.55, BELLY);
      skin.addColorStop(1, SKIN_DARK);
      ctx.fillStyle = skin;
      ctx.fill();

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

      // 바닥 젤리
      const size = radius * 0.3;
      for (const jelly of jellies.current) {
        if (eating.current?.jelly.id === jelly.id) continue;
        const fall = jelly.drop ** 2 * radius * 0.9;
        drawFloorJelly(
          ctx,
          bx + jelly.x * radius,
          by + jelly.y * radius - fall,
          size,
          JELLY_COLORS[jelly.color],
          jelly.kind,
        );
      }

      // 코는 얼굴에 붙어 있다. 젤리를 주울 땐 코끝이 그리로 뻗는다.
      const swing = squish.current.pressDepth * 0.5 + Math.sin(now / 900) * 0.06;
      let tip: { x: number; y: number } | undefined;
      const act = eating.current;
      if (act) {
        const from = { x: bx + act.jelly.x * radius, y: by + act.jelly.y * radius };
        if (act.phase === "reach") {
          const rest = { x: bx + headR * 0.68, y: headY + headR * 1.56 };
          const e = 1 - (1 - act.t) ** 2;
          tip = { x: rest.x + (from.x - rest.x) * e, y: rest.y + (from.y - rest.y) * e };
        } else if (act.phase === "lift") {
          const e = act.t * act.t * (3 - 2 * act.t);
          tip = { x: from.x + (mouth.x - from.x) * e, y: from.y + (mouth.y - from.y) * e };
        } else {
          tip = mouth;
        }
      }
      const trunkTip = drawTrunk(ctx, bx, headY + headR * 0.04, headR, swing, tip);

      // 코끝에 매달린 젤리
      if (act && act.phase !== "cheer") {
        drawFloorJelly(ctx, trunkTip.x, trunkTip.y, size * 0.9, JELLY_COLORS[act.jelly.color], act.jelly.kind);
      }

      // 눈
      const lid = blink.current;
      for (const side of [-1, 1]) {
        const ex = bx + side * headR * 0.38;
        const ey = headY - headR * 0.14;
        if (lid > 0.45) {
          ctx.lineWidth = headR * 0.075;
          ctx.strokeStyle = "#3b2f45";
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(ex, ey + headR * 0.06, headR * 0.16, Math.PI * 1.12, Math.PI * 1.88);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#3b2f45";
          ctx.beginPath();
          ctx.ellipse(ex, ey, headR * 0.125, headR * 0.155 * (1 - lid * 0.5), 0, 0, Math.PI * 2);
          ctx.fill();
          // 반짝이 두 점. 이게 있고 없고가 귀여움의 전부다.
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(ex - headR * 0.045, ey - headR * 0.055, headR * 0.045, headR * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(ex + headR * 0.05, ey + headR * 0.05, headR * 0.022, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // 볼
      ctx.fillStyle = "rgba(226, 150, 170, 0.3)";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(bx + side * headR * 0.62, headY + headR * 0.22, headR * 0.16, headR * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 야르!
      if (cheer.current > 0) {
        const pop = Math.min(1, (1 - cheer.current) * 5);
        ctx.save();
        ctx.globalAlpha = Math.min(1, cheer.current * 2.4);
        ctx.translate(bx + headR * 1.1, headY - headR * 1.0 - (1 - cheer.current) * headR * 0.3);
        ctx.scale(pop, pop);
        ctx.font = `700 ${headR * 0.52}px Jua, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = headR * 0.16;
        ctx.strokeStyle = "#fff";
        ctx.lineJoin = "round";
        ctx.strokeText("야르!", 0, 0);
        ctx.fillStyle = cheerColor.current;
        ctx.fillText("야르!", 0, 0);
        ctx.restore();
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
          {eaten > 0 ? `젤리 ${eaten}개` : hits > 0 ? `${hits}번` : ""}
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pb-3">
        <canvas
          ref={canvasRef}
          className="aspect-[1/1.24] w-full max-w-[420px] touch-none select-none"
        />
        <p className="mt-1 h-5 text-sm text-ink-soft">배는 두드리고, 젤리는 눌러서 먹여요</p>
      </main>
    </>
  );
}

