import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { db, writeSetting } from "../data/db";
import {
  type Falling,
  drawFalling,
  drawSquirrel,
  playCatch,
  playLeaf,
  playMiss,
  playOuch,
} from "../lib/autumn";
import { useSettings } from "../lib/settings";

const BEST_KEY = "acornBest";

interface Item {
  id: number;
  kind: Falling;
  /** 화면 폭을 1 로 둔 자리 */
  x: number;
  /** 화면 높이를 1 로 둔 자리 */
  y: number;
  vy: number;
  rot: number;
  vr: number;
  /** 은행잎만 좌우로 팔랑인다 */
  swayAt: number;
  swayBy: number;
}

/** 목숨. 놓친 것도 목숨을 깎으니 셋이면 손도 못 풀고 끝난다. */
const LIVES = 5;
/** 다람쥐가 서 있는 높이 (화면 높이를 1 로 둔 자리) */
const GROUND = 0.84;
/** 이 폭 안에 들어오면 받은 것으로 친다 (화면 폭 대비) */
const CATCH = 0.14;

let seq = 0;

export function AcornScreen() {
  const settings = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const best = useLiveQuery(async () => ((await db.meta.get(BEST_KEY))?.value as number) ?? 0, []);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [over, setOver] = useState(false);
  const [round, setRound] = useState(0);

  // 그리기 루프가 매 프레임 보는 값들. 상태로 두면 초당 예순 번 다시 그린다.
  const items = useRef<Item[]>([]);
  const squirrel = useRef({ x: 0.5, aim: 0.5, lean: 0, joy: 0 });
  const streak = useRef(0);
  const clock = useRef({ next: 0, elapsed: 0 });
  const alive = useRef(true);
  const muted = useRef(false);
  const scoreRef = useRef(0);

  useEffect(() => {
    muted.current = Boolean(settings?.muted);
  }, [settings?.muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    items.current = [];
    squirrel.current = { x: 0.5, aim: 0.5, lean: 0, joy: 0 };
    streak.current = 0;
    clock.current = { next: 0.8, elapsed: 0 };
    alive.current = true;
    scoreRef.current = 0;

    let raf = 0;
    let prev = performance.now();
    let w = 0;
    let h = 0;

    const fit = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const box = canvas.getBoundingClientRect();
      w = box.width;
      h = box.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);

    /* ---------- 손가락 ---------- */

    // 손가락이 다람쥐 위에 있으면 정작 다람쥐가 안 보인다.
    // 그래서 화면 아무 데나 짚어도 그 가로 자리로 달려가게 한다.
    const aimAt = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      squirrel.current.aim = Math.min(0.92, Math.max(0.08, (e.clientX - box.left) / box.width));
    };
    const onDown = (e: PointerEvent) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // 이미 사라진 포인터면 그냥 넘어간다
      }
      aimAt(e);
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons === 0 && e.pointerType === "mouse") return;
      aimAt(e);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);

    /* ---------- 떨어뜨리기 ---------- */

    const spawn = () => {
      const t = clock.current.elapsed;
      // 밤송이는 처음 몇 초는 안 나온다. 규칙부터 익히게.
      const roll = Math.random();
      const kind: Falling =
        t > 6 && roll < 0.16 ? "burr" : roll > 0.88 ? "leaf" : "acorn";
      // 오래 할수록 빨라지되 천장을 둔다. 끝없이 빨라지면 실력이 아니라 반사신경이 된다.
      const speed = Math.min(0.6, 0.21 + t * 0.006) * (kind === "leaf" ? 0.55 : 1);
      seq += 1;
      items.current.push({
        id: seq,
        kind,
        x: 0.1 + Math.random() * 0.8,
        y: -0.08,
        vy: speed * (0.85 + Math.random() * 0.3),
        // 도토리는 꼭지가 위로 선 채 갸우뚱거려야 도토리로 읽힌다.
        // 마구 돌리면 깍정이가 밑으로 가서 무슨 팽이처럼 보인다.
        rot: (Math.random() - 0.5) * (kind === "leaf" ? Math.PI * 2 : 0.6),
        vr: (Math.random() - 0.5) * (kind === "leaf" ? 2.6 : 0.7),
        swayAt: Math.random() * Math.PI * 2,
        swayBy: kind === "leaf" ? 0.055 : 0,
      });
      clock.current.next = Math.max(0.44, 1.45 - t * 0.022) * (0.7 + Math.random() * 0.6);
    };

    const hurt = () => {
      streak.current = 0;
      setLives((n) => {
        const left = n - 1;
        if (left <= 0) {
          alive.current = false;
          setOver(true);
          const final = scoreRef.current;
          void db.meta.get(BEST_KEY).then((row) => {
            if (final > (((row?.value as number) ?? 0) as number)) {
              void writeSetting(BEST_KEY, final);
            }
          });
        }
        return Math.max(0, left);
      });
    };

    /* ---------- 한 프레임 ---------- */

    const step = (dt: number) => {
      if (!alive.current) return;
      clock.current.elapsed += dt;
      clock.current.next -= dt;
      if (clock.current.next <= 0) spawn();

      const s = squirrel.current;
      const gap = s.aim - s.x;
      // 손가락을 따라가되 조금 늦게. 딱 붙어 다니면 받는 맛이 없다.
      s.x += gap * Math.min(1, dt * 11);
      s.lean = Math.max(-1, Math.min(1, gap * 7));
      s.joy = Math.max(0, s.joy - dt * 2.6);

      for (const it of items.current) {
        it.y += it.vy * dt;
        it.rot += it.vr * dt;
        it.swayAt += dt * 2.6;
      }

      const kept: Item[] = [];
      for (const it of items.current) {
        const x = it.x + Math.sin(it.swayAt) * it.swayBy;
        if (it.y >= GROUND - 0.03 && it.y <= GROUND + 0.06) {
          if (Math.abs(x - s.x) < CATCH) {
            if (it.kind === "burr") {
              if (!muted.current) playOuch();
              navigator.vibrate?.([18, 40, 18]);
              hurt();
            } else {
              const add = it.kind === "leaf" ? 3 : 1;
              scoreRef.current += add;
              setScore(scoreRef.current);
              s.joy = 1;
              if (!muted.current) {
                if (it.kind === "leaf") playLeaf();
                else playCatch(streak.current);
              }
              navigator.vibrate?.(8);
              streak.current += 1;
            }
            continue;
          }
        }
        if (it.y > 1.12) {
          // 밤송이는 놓치는 게 맞다. 도토리만 아깝다.
          if (it.kind !== "burr") {
            if (!muted.current) playMiss();
            hurt();
          }
          continue;
        }
        kept.push(it);
      }
      items.current = kept;
    };

    /* ---------- 그리기 ---------- */

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      step(dt);

      ctx.clearRect(0, 0, w, h);

      // 바닥. 다람쥐가 발을 딛는 자리가 보여야 거리감이 생긴다.
      const soil = ctx.createLinearGradient(0, h * GROUND, 0, h);
      soil.addColorStop(0, "rgba(180, 140, 96, .18)");
      soil.addColorStop(1, "rgba(180, 140, 96, .06)");
      ctx.fillStyle = soil;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * (GROUND + 0.2), w * 0.95, h * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();

      const r = Math.min(w * 0.075, h * 0.052);
      for (const it of items.current) {
        const x = (it.x + Math.sin(it.swayAt) * it.swayBy) * w;
        drawFalling(ctx, it.kind, x, it.y * h, r, it.rot);
      }

      const s = squirrel.current;
      drawSquirrel(ctx, s.x * w, h * GROUND, Math.min(w * 0.15, h * 0.1), s.lean, s.joy);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, [round]);

  const restart = () => {
    setScore(0);
    setLives(LIVES);
    setOver(false);
    setRound((n) => n + 1);
  };

  return (
    <>
      <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
        <Link to="/" className="justify-self-start text-base text-ink-soft">
          ‹ 선반
        </Link>
        <h1 className="font-display text-lg">도토리 받기</h1>
        <span className="justify-self-end text-xs text-ink-faint tabular-nums">
          {best ? `최고 ${best}` : ""}
        </span>
      </header>

      <div className="flex flex-none items-center justify-between px-5 pb-1">
        <span className="font-display text-2xl tabular-nums">{score}</span>
        <span className="flex items-center gap-1" aria-label={`목숨 ${lives}개`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={`size-2.5 rounded-full transition ${
                i < lives ? "bg-accent" : "bg-line"
              }`}
            />
          ))}
        </span>
      </div>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-2 pb-3">
        <canvas
          ref={canvasRef}
          className="aspect-[1/1.42] w-full max-w-[420px] touch-none select-none"
        />
        <p className="mt-1 h-5 text-sm text-ink-soft">
          {over ? "" : "화면을 짚으면 다람쥐가 그리로 달려가요"}
        </p>

        {over ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg/80 backdrop-blur-sm">
            <p className="font-display text-2xl">도토리 {score}개</p>
            <p className="text-sm text-ink-soft">
              {score > 0 && score >= (best ?? 0) ? "최고 기록이에요!" : `최고 기록 ${best ?? 0}개`}
            </p>
            <div className="mt-1 flex gap-2">
              <Link
                to="/"
                className="rounded-2xl bg-surface px-5 py-2.5 text-sm font-medium text-ink-soft transition active:scale-95"
              >
                그만할래요
              </Link>
              <button
                type="button"
                onClick={restart}
                className="rounded-2xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition active:scale-95"
              >
                다시 하기
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
