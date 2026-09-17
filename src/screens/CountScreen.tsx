import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Jelly } from "../components/Jelly";
import { db, writeSetting } from "../data/db";
import type { JellyColor, JellyShape } from "../data/types";
import { playNote, playWrong } from "../lib/chime";
import { useSettings } from "../lib/settings";

const BEST_KEY = "countBest";
const LIVES = 3;

const SHAPES: JellyShape[] = ["bear", "ring", "cube", "worm", "heart", "bottle"];
const COLORS: JellyColor[] = ["grape", "berry", "green", "orange", "lemon", "soda", "peach", "cola"];

interface Spot {
  x: number;
  y: number;
  rotate: number;
  shape: JellyShape;
  color: JellyColor;
}

interface Side {
  count: number;
  /** 알 하나의 크기 (칸 너비 대비 %) */
  size: number;
  spots: Spot[];
}

interface Quiz {
  left: Side;
  right: Side;
  /** 정답은 어느 쪽인가 */
  more: "left" | "right";
  /** 이 문제에 주어진 시간 (초) */
  limit: number;
}

/** 자리를 흔드는 폭 (칸 너비 대비 %) */
const JITTER = 3;

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 개수에 맞춰 격자를 고른다. 적게 놓을 땐 굵게, 많이 놓을 땐 잘게.
 * 한 칸에 하나씩만 놓으니 격자 칸 수가 담을 수 있는 최대 개수다.
 */
function gridFor(most: number): number {
  if (most <= 9) return 4;
  if (most <= 16) return 5;
  return 6;
}

/**
 * 이 격자에서 겹치지 않는 가장 큰 알 지름 (칸 너비 대비 %).
 *
 * 알 반지름만큼 가장자리를 비워야 잘리지 않고, 남은 폭을 격자로 나눈 것이
 * 칸 하나다. 알이 그 칸보다 굵으면 옆 알과 겹친다.
 * s/2 + s*g + s/2 + 흔들림 ≤ 100 을 s 로 풀면 이 식이 나온다.
 */
function fitSize(grid: number): number {
  return (100 - JITTER * 2) / (grid + 1);
}

/** 격자 칸을 골라 흩뿌린다. 서로 겹치지 않아야 셀 마음이 든다. */
function scatter(count: number, grid: number, size: number): Spot[] {
  // 알 반지름만큼 안쪽으로 물린다. 안 그러면 가장자리 알이 칸 밖으로 잘린다.
  const pad = size / 2 + JITTER;
  const span = 100 - pad * 2;

  const cells = shuffled(
    Array.from({ length: grid * grid }, (_, i) => ({ col: i % grid, row: Math.floor(i / grid) })),
  ).slice(0, count);

  return cells.map(({ col, row }) => ({
    x: pad + ((col + 0.5) / grid) * span + (Math.random() - 0.5) * JITTER * 2,
    y: pad + ((row + 0.5) / grid) * span + (Math.random() - 0.5) * JITTER * 2,
    rotate: (Math.random() - 0.5) * 50,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
}

/**
 * 문제 하나.
 *
 * 풀수록 개수가 늘고 두 쪽의 차이가 줄고 시간이 짧아진다.
 *
 * 알 크기를 양쪽 따로 뽑는 게 핵심이다. 크기가 같으면 많은 쪽이 언제나 더
 * 넓어 보여서, 세어 볼 것도 없이 넓은 쪽만 찍으면 된다. 크기를 흔들어 두면
 * 적은 쪽이 더 넓어 보이는 문제도 나와서 그제서야 진짜로 세게 된다.
 */
function makeQuiz(solved: number): Quiz {
  const base = Math.min(16, 4 + Math.floor(solved * 0.7));
  const gap = Math.max(1, 5 - Math.floor(solved / 3));
  const big = base + gap;

  const grid = gridFor(big);
  const most = fitSize(grid);
  // 겹치지 않는 최대치의 80~98%. 이만큼 흔들어야 넓이로는 못 맞힌다.
  const sizes = [most * (0.8 + Math.random() * 0.18), most * (0.8 + Math.random() * 0.18)];

  const more = Math.random() < 0.5 ? "left" : "right";
  const counts = more === "left" ? [big, base] : [base, big];

  return {
    left: { count: counts[0], size: sizes[0], spots: scatter(counts[0], grid, sizes[0]) },
    right: { count: counts[1], size: sizes[1], spots: scatter(counts[1], grid, sizes[1]) },
    more,
    limit: Math.max(2.4, 5 - solved * 0.12),
  };
}

export function CountScreen() {
  const settings = useSettings();
  const best = useLiveQuery(async () => ((await db.meta.get(BEST_KEY))?.value as number) ?? 0, []);

  const [quiz, setQuiz] = useState<Quiz>();
  const [solved, setSolved] = useState(0);
  const [lives, setLives] = useState(LIVES);
  /** 답을 냈다. side 가 없으면 시간이 다 된 것. */
  const [mark, setMark] = useState<{ side?: "left" | "right"; ok: boolean }>();
  const [over, setOver] = useState(false);
  /** 남은 시간 비율 0~1 */
  const [left, setLeft] = useState(1);

  const muted = Boolean(settings?.muted);
  const solvedRef = useRef(0);

  const finish = useCallback(() => {
    setOver(true);
    const final = solvedRef.current;
    void db.meta.get(BEST_KEY).then((row) => {
      if (final > (((row?.value as number) ?? 0) as number)) void writeSetting(BEST_KEY, final);
    });
  }, []);

  /** 답 하나를 매듭짓는다. side 가 없으면 시간이 다 된 것이다. */
  const resolve = useCallback(
    (side?: "left" | "right") => {
      if (!quiz) return;
      const ok = side === quiz.more;
      setMark({ side, ok });

      if (ok) {
        solvedRef.current += 1;
        setSolved(solvedRef.current);
        if (!muted) playNote(solvedRef.current % 6);
        navigator.vibrate?.(8);
        return;
      }
      if (!muted) playWrong();
      navigator.vibrate?.([18, 50, 18]);
      setLives((n) => {
        if (n - 1 <= 0) finish();
        return Math.max(0, n - 1);
      });
    },
    [quiz, muted, finish],
  );

  /* 남은 시간을 그리려면 매 프레임 상태를 밀어야 한다.
     effect 안의 setState 를 막는 규칙은 이 경우를 위한 게 아니다. */
  /* oxlint-disable react/set-state-in-effect */
  // 문제가 떠 있고 아직 답을 안 냈을 때만 시간이 흐른다
  useEffect(() => {
    if (!quiz || mark || over) return;
    const span = quiz.limit * 1000;
    const end = performance.now() + span;
    let raf = 0;
    const tick = () => {
      const remain = (end - performance.now()) / span;
      if (remain <= 0) {
        setLeft(0);
        resolve(undefined);
        return;
      }
      setLeft(remain);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [quiz, mark, over, resolve]);

  // 답을 보여준 뒤 다음 문제로. 틀렸을 땐 개수를 볼 시간을 조금 더 준다.
  useEffect(() => {
    if (!mark || over) return;
    const t = window.setTimeout(
      () => {
        setQuiz(makeQuiz(solvedRef.current));
        setMark(undefined);
        setLeft(1);
      },
      mark.ok ? 380 : 900,
    );
    return () => clearTimeout(t);
  }, [mark, over]);
  /* oxlint-enable react/set-state-in-effect */

  const start = () => {
    solvedRef.current = 0;
    setSolved(0);
    setLives(LIVES);
    setOver(false);
    setMark(undefined);
    setLeft(1);
    setQuiz(makeQuiz(0));
  };

  const pick = (side: "left" | "right") => {
    if (!quiz || mark || over) return;
    resolve(side);
  };

  const ready = quiz && !over;

  return (
    <>
      <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
        <Link to="/play" className="justify-self-start text-base text-ink-soft">
          ‹ 놀이터
        </Link>
        <h1 className="font-display text-lg">개수 비교</h1>
        <span className="justify-self-end text-xs text-ink-faint tabular-nums">
          {best ? `최고 ${best}` : ""}
        </span>
      </header>

      <div className="flex flex-none items-center justify-between px-5 pb-2">
        <span className="font-display text-2xl tabular-nums">{solved}</span>
        <span className="flex items-center gap-1" aria-label={`목숨 ${lives}개`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={`size-2.5 rounded-full transition ${i < lives ? "bg-accent" : "bg-line"}`}
            />
          ))}
        </span>
      </div>

      {/* 남은 시간. 숫자로 세면 그거 보느라 문제를 못 본다. */}
      <div className="mx-5 h-1.5 flex-none overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-100 ease-linear"
          style={{ width: `${(ready ? left : 0) * 100}%` }}
        />
      </div>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-4">
        {quiz ? (
          <div className="grid w-full max-w-[420px] grid-cols-2 gap-3">
            {(["left", "right"] as const).map((side) => {
              const panel = quiz[side];
              const chosen = mark?.side === side;
              return (
                <motion.button
                  key={side}
                  type="button"
                  aria-label={side === "left" ? "왼쪽이 더 많아요" : "오른쪽이 더 많아요"}
                  disabled={Boolean(mark) || over}
                  onClick={() => pick(side)}
                  animate={{ scale: chosen ? 0.96 : 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                  className="relative aspect-square overflow-hidden rounded-3xl bg-surface"
                  style={{
                    boxShadow: chosen
                      ? mark?.ok
                        ? "0 0 0 3px var(--accent)"
                        : "0 0 0 3px #EF5D7A"
                      : "none",
                  }}
                >
                  {panel.spots.map((spot, i) => (
                    <span
                      key={i}
                      className="absolute block -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${spot.x}%`,
                        top: `${spot.y}%`,
                        width: `${panel.size}%`,
                        transform: `translate(-50%, -50%) rotate(${spot.rotate}deg)`,
                      }}
                    >
                      <Jelly shape={spot.shape} color={spot.color} size="100%" />
                    </span>
                  ))}
                  {/* 답을 보고 나서야 개수를 알려준다. 미리 있으면 셀 이유가 없다. */}
                  {mark ? (
                    <span className="absolute inset-x-0 bottom-0 bg-bg/85 py-1 text-center font-display text-base tabular-nums">
                      {panel.count}
                    </span>
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-display text-xl">어느 쪽이 더 많을까요?</p>
            <p className="max-w-[26ch] text-sm leading-relaxed text-ink-soft">
              두 칸 중 젤리가 많은 쪽을 고르세요. 알 크기는 매번 달라지니 넓이로는 못
              맞혀요.
            </p>
          </div>
        )}

        <p className="mt-4 h-5 text-sm text-ink-soft">
          {over ? "" : quiz ? "많은 쪽을 누르세요" : ""}
        </p>

        {!quiz || over ? (
          <div className="mt-2 flex flex-col items-center gap-2">
            {over ? (
              <>
                <p className="font-display text-2xl">{solved}개 맞혔어요</p>
                <p className="text-sm text-ink-soft">
                  {solved > 0 && solved >= (best ?? 0)
                    ? "최고 기록이에요!"
                    : `최고 기록 ${best ?? 0}개`}
                </p>
              </>
            ) : null}
            <button
              type="button"
              onClick={start}
              className="mt-1 rounded-2xl bg-accent px-7 py-3 font-display text-base text-white transition active:scale-95"
            >
              {over ? "다시 하기" : "시작하기"}
            </button>
          </div>
        ) : null}
      </main>
    </>
  );
}
