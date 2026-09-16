import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { JellyColor } from "../data/types";
import { JELLY_COLORS } from "../lib/jelly";
import { useSettings } from "../lib/settings";
import { SquishVoice, playCrack } from "../lib/squish";
import {
  type Chip,
  type Squish,
  blobRadius,
  chipRadiusAt,
  hold,
  makeChip,
  peeled,
  pressAt,
  relax,
  restingSquish,
} from "../lib/waxball";

const COLORS: JellyColor[] = ["grape", "berry", "green", "orange", "lemon", "soda", "peach", "cola"];
/** 한 번 눌렀을 때 깨지는 넓이 (공 반지름 대비) */
const CHIP_SIZE = 0.23;
/** 이만큼 벗겨지면 남은 왁스가 저절로 사라진다. 마지막 조각을 찾아다니게 두면 지친다. */
const ABSORB_AT = 0.86;
/**
 * 가장 많이 늘어났을 때의 반지름. 공을 이 값으로 나눠 두면
 * 아무리 잡아당겨도 캔버스 밖으로 안 나간다 - 네모에 잘려 보이면 다 깨진다.
 */
const MAX_REACH = 1.78;

export function WaxBallScreen() {
  const settings = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState<JellyColor>(
    () => COLORS[Math.floor(Math.random() * COLORS.length)],
  );
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<"wax" | "squish">("wax");

  const chips = useRef<Chip[]>([]);
  const absorb = useRef(0);
  const squish = useRef<Squish>(restingSquish());
  const pointer = useRef({ down: false, speed: 0, lastX: 0, lastY: 0, carvedX: 99, carvedY: 99 });
  const voice = useRef(new SquishVoice());
  const muted = useRef(false);
  const waxDirty = useRef(true);

  useEffect(() => {
    muted.current = Boolean(settings?.muted);
  }, [settings?.muted]);

  useEffect(() => {
    chips.current = [];
    absorb.current = 0;
    squish.current = restingSquish();
    waxDirty.current = true;
  }, [round]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const squishVoice = voice.current;

    const wax = document.createElement("canvas");
    const wctx = wax.getContext("2d");
    if (!wctx) return;

    let raf = 0;
    let prev = performance.now();
    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    let radius = 0;
    let dpr = 1;

    const fit = () => {
      dpr = Math.min(3, window.devicePixelRatio || 1);
      const box = canvas.getBoundingClientRect();
      w = box.width;
      h = box.height;
      cx = w / 2;
      cy = h * 0.47;
      // 늘어나도 잘리지 않도록 가장 많이 뻗을 길이를 기준으로 잡는다
      radius = Math.min(w / 2, h * 0.47, h * 0.53) / MAX_REACH;
      for (const c of [canvas, wax]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      waxDirty.current = true;
    };
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);

    /* ---------- 왁스 껍질 ---------- */

    const paintWax = () => {
      wctx.clearRect(0, 0, w, h);

      // 매끈한 왁스 구. 금이 가기 전에는 이음매가 하나도 보이면 안 된다.
      wctx.save();
      wctx.beginPath();
      wctx.arc(cx, cy, radius, 0, Math.PI * 2);
      wctx.clip();

      const shell = wctx.createRadialGradient(
        cx - radius * 0.34,
        cy - radius * 0.4,
        radius * 0.08,
        cx,
        cy,
        radius * 1.12,
      );
      shell.addColorStop(0, "#fdfcfa");
      shell.addColorStop(0.52, "#ece7e1");
      shell.addColorStop(1, "#c8bfb8");
      wctx.fillStyle = shell;
      wctx.fillRect(0, 0, w, h);

      wctx.globalAlpha = 0.5;
      wctx.fillStyle = "#fff";
      wctx.beginPath();
      wctx.ellipse(
        cx - radius * 0.33,
        cy - radius * 0.4,
        radius * 0.2,
        radius * 0.12,
        -0.6,
        0,
        Math.PI * 2,
      );
      wctx.fill();
      wctx.globalAlpha = 1;

      // 실금은 구멍보다 먼저. 그래야 구멍 안쪽 금이 같이 지워진다.
      wctx.strokeStyle = "rgba(96, 78, 88, 0.35)";
      wctx.lineWidth = Math.max(0.8, radius * 0.008);
      for (const chip of chips.current) {
        for (const crack of chip.cracks) {
          const ox = cx + chip.x * radius;
          const oy = cy + chip.y * radius;
          wctx.beginPath();
          wctx.moveTo(ox, oy);
          let px = ox;
          let py = oy;
          const steps = 4;
          for (let k = 1; k <= steps; k += 1) {
            const wobble = (k % 2 === 0 ? 1 : -1) * crack.length * 0.12;
            const a = crack.angle + wobble * 0.5;
            px += Math.cos(a) * ((crack.length * radius) / steps);
            py += Math.sin(a) * ((crack.length * radius) / steps);
            wctx.lineTo(px, py);
          }
          wctx.stroke();
        }
      }
      wctx.restore();

      // 깨진 자리를 파낸다
      wctx.globalCompositeOperation = "destination-out";
      for (const chip of chips.current) {
        wctx.beginPath();
        const steps = 40;
        for (let i = 0; i <= steps; i += 1) {
          const a = (i / steps) * Math.PI * 2;
          const r = chipRadiusAt(chip, a);
          const x = cx + (chip.x + Math.cos(a) * r) * radius;
          const y = cy + (chip.y + Math.sin(a) * r) * radius;
          if (i === 0) wctx.moveTo(x, y);
          else wctx.lineTo(x, y);
        }
        wctx.closePath();
        wctx.fill();
      }
      wctx.globalCompositeOperation = "source-over";
      waxDirty.current = false;
    };

    /* ---------- 손가락 ---------- */

    const local = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return { x: (e.clientX - box.left - cx) / radius, y: (e.clientY - box.top - cy) / radius };
    };

    const carve = (x: number, y: number) => {
      if (absorb.current > 0) return false;
      // 같은 자리를 계속 파지 않는다
      if (Math.hypot(x - pointer.current.carvedX, y - pointer.current.carvedY) < CHIP_SIZE * 0.55) {
        return false;
      }
      const reach = Math.hypot(x, y);
      if (reach > 1.05) return false;

      pointer.current.carvedX = x;
      pointer.current.carvedY = y;
      chips.current.push(makeChip(x, y, CHIP_SIZE));
      waxDirty.current = true;

      if (!muted.current) playCrack(3 + Math.floor(Math.random() * 3));
      navigator.vibrate?.(14);

      if (peeled(chips.current) >= ABSORB_AT) absorb.current = 0.0001;
      return true;
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const p = local(e);
      pointer.current.down = true;
      pointer.current.lastX = p.x;
      pointer.current.lastY = p.y;
      pointer.current.speed = 0;
      pointer.current.carvedX = 99;
      pointer.current.carvedY = 99;

      // 깨지든 말랑이든 누르는 감각은 언제나 있어야 한다
      const carved = carve(p.x, p.y);
      // 짚은 자리에 따라 홈과 납작함을 나눠 받는다
      const poke = pressAt(Math.hypot(p.x, p.y), chipsRemain() ? 0.62 : 0.92);
      squish.current = hold(squish.current, {
        pressAngle: Math.atan2(p.y, p.x),
        pressDepth: poke.dent,
        squash: poke.squash,
      });
      if (carved) return;
      if (chipsRemain()) return;
      if (!muted.current) squishVoice.start();
    };

    const chipsRemain = () => absorb.current < 1;

    const onMove = (e: PointerEvent) => {
      const p = local(e);
      const moved = Math.hypot(p.x - pointer.current.lastX, p.y - pointer.current.lastY);
      pointer.current.speed = pointer.current.speed * 0.7 + moved * 4 * 0.3;
      pointer.current.lastX = p.x;
      pointer.current.lastY = p.y;
      if (!pointer.current.down) return;

      const carved = carve(p.x, p.y);
      const drag = Math.min(1, pointer.current.speed);
      const pull = Math.min(1, Math.hypot(p.x, p.y));
      const angle = Math.atan2(p.y, p.x);

      // 왁스가 남아 있어도 공은 눌리고 딸려온다. 다만 굳은 껍질이라 덜 무르다.
      if (chipsRemain()) {
        const shell = pressAt(pull, 0.62 * (1 - drag * 0.6));
        squish.current = hold(squish.current, {
          pressAngle: angle,
          pressDepth: shell.dent,
          squash: shell.squash,
          stretchAngle: angle,
          stretch: Math.min(1, pull * 0.5),
        });
        return;
      }
      if (carved) return;
      // 잡아당기면 잡은 자리는 들어가는 게 아니라 딸려 나온다.
      // 손가락이 빠를수록 누름을 접고 끌기에 자리를 내준다.
      const knead = pressAt(pull, 0.92 * (1 - drag * 0.85));
      squish.current = hold(squish.current, {
        pressAngle: angle,
        pressDepth: knead.dent,
        squash: knead.squash,
        stretchAngle: angle,
        stretch: Math.min(1, pull * 0.95),
      });
      if (!muted.current) squishVoice.update(Math.min(1, pointer.current.speed));
    };

    const onUp = () => {
      pointer.current.down = false;
      squishVoice.stop();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    /* ---------- 그리기 ---------- */

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      // 다 벗겨질 즈음이면 남은 왁스가 스르르 사라진다
      if (absorb.current > 0 && absorb.current < 1) {
        absorb.current = Math.min(1, absorb.current + dt * 2.2);
        if (absorb.current >= 1) setPhase("squish");
      }
      if (!pointer.current.down) {
        squish.current = relax(squish.current, dt);
        pointer.current.speed *= 0.88;
      }
      if (waxDirty.current) paintWax();

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cx, cy);

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#3b2430";
      ctx.beginPath();
      ctx.ellipse(0, radius * 1.08, radius * 0.7, radius * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 왁스가 남아 있는 동안은 껍질과 알맹이가 한 덩어리로 눌린다.
      // 알맹이만 모양을 바꾸면 위에 덮인 왁스 그림과 어긋나 보인다.
      const shelled = absorb.current < 1;
      ctx.save();
      if (shelled) squashWhole(ctx, squish.current, radius);

      const jelly = JELLY_COLORS[color];
      ctx.beginPath();
      const STEPS = 150;
      for (let i = 0; i <= STEPS; i += 1) {
        const a = (i / STEPS) * Math.PI * 2;
        const r = (shelled ? 1 : blobRadius(a, squish.current)) * radius;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const body = ctx.createRadialGradient(
        -radius * 0.32,
        -radius * 0.36,
        radius * 0.08,
        0,
        0,
        radius * 1.15,
      );
      body.addColorStop(0, shade(jelly, 1.38));
      body.addColorStop(0.55, jelly);
      body.addColorStop(1, shade(jelly, 0.7));
      ctx.fillStyle = body;
      ctx.fill();

      ctx.save();
      ctx.clip();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(-radius * 0.3, -radius * 0.37, radius * 0.2, radius * 0.13, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.ellipse(radius * 0.3, radius * 0.33, radius * 0.15, radius * 0.08, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (shelled) {
        ctx.globalAlpha = 1 - absorb.current;
        ctx.drawImage(wax, -cx, -cy, w, h);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      ctx.restore();

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
      squishVoice.stop();
    };
  }, [color, round]);

  return (
    <>
      <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
        <Link to="/" className="justify-self-start text-base text-ink-soft">
          ‹ 선반
        </Link>
        <h1 className="font-display text-lg">젤리 왁뿌볼</h1>
        <button
          type="button"
          onClick={() => {
            // 상태는 눌린 그 자리에서 되돌린다. effect 에서 하면 한 번 더 그려진다.
            setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
            setRound((n) => n + 1);
            setPhase("wax");
          }}
          className="justify-self-end rounded-full bg-accent-bg px-3 py-1.5 text-xs font-medium text-accent transition active:scale-95"
        >
          새 왁뿌볼 받기
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pb-4">
        <canvas
          ref={canvasRef}
          className="aspect-[1/1.06] w-full max-w-[420px] touch-none select-none"
        />
        <p className="mt-1 h-5 text-sm text-ink-soft">
          {phase === "squish" ? "말랑말랑 · 문지르면 늘어나요" : "눌러서 왁스를 깨보세요"}
        </p>
      </main>
    </>
  );
}

function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(((n >> 16) & 255) * amount)}, ${clamp(((n >> 8) & 255) * amount)}, ${clamp((n & 255) * amount)})`;
}

/**
 * 공을 통째로 눌러 찌그러뜨린다.
 *
 * 왁스가 덮여 있을 땐 겉과 속이 한 덩어리라 표면을 따로 주무를 수 없다.
 * 누른 방향으로 납작해지고 그 방향으로 조금 밀리게만 해도 눌린 느낌이 난다.
 */
function squashWhole(ctx: CanvasRenderingContext2D, s: Squish, radius: number) {
  const push = s.pressDepth;
  const pull = s.stretch;
  const flat = s.squash;
  // 되튈 때는 음수가 된다. 껍질도 한 번 지나쳤다가 돌아와야 탱글해 보인다.
  if (Math.abs(push) < 0.002 && Math.abs(pull) < 0.002 && Math.abs(flat) < 0.002) return;

  ctx.translate(
    Math.cos(s.stretchAngle) * radius * 0.16 * pull + Math.cos(s.pressAngle) * radius * 0.06 * push,
    Math.sin(s.stretchAngle) * radius * 0.16 * pull + Math.sin(s.pressAngle) * radius * 0.06 * push,
  );
  ctx.rotate(s.pressAngle);
  ctx.scale(1 - 0.17 * push - 0.1 * flat, 1 + 0.11 * push - 0.1 * flat);
  ctx.rotate(-s.pressAngle);
}
