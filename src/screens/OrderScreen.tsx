import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Jelly } from "../components/Jelly";
import { db, writeSetting } from "../data/db";
import type { JellyColor, JellyShape } from "../data/types";
import { playClear, playNote, playWrong } from "../lib/chime";
import { JELLY_TINTS } from "../lib/jelly";
import { useSettings } from "../lib/settings";

const BEST_KEY = "orderBest";

/** 여섯 알. 모양도 색도 다 달라야 소리 없이도 구분된다. */
const PADS: { shape: JellyShape; color: JellyColor }[] = [
  { shape: "bear", color: "orange" },
  { shape: "ring", color: "berry" },
  { shape: "cube", color: "grape" },
  { shape: "worm", color: "green" },
  { shape: "heart", color: "peach" },
  { shape: "bottle", color: "soda" },
];

/** 한 알이 반짝이는 시간과 사이 간격 */
const LIT = 400;
const GAP = 170;

type Phase = "ready" | "showing" | "input" | "over";

export function OrderScreen() {
  const settings = useSettings();
  const best = useLiveQuery(async () => ((await db.meta.get(BEST_KEY))?.value as number) ?? 0, []);

  const [phase, setPhase] = useState<Phase>("ready");
  const [order, setOrder] = useState<number[]>([]);
  const [lit, setLit] = useState<number>();
  const [wrong, setWrong] = useState<number>();
  /**
   * 몇 번째 알을 기다리는 중인가.
   * ref 로 두면 화면의 진행 표시가 안 따라온다 - 그리는 값은 상태여야 한다.
   */
  const [at, setAt] = useState(0);
  const timers = useRef<number[]>([]);

  const muted = Boolean(settings?.muted);
  const round = order.length;

  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** 지금까지의 순서를 하나씩 보여준다 */
  const replay = useCallback(
    (seq: number[]) => {
      clearTimers();
      setPhase("showing");
      setLit(undefined);
      setAt(0);

      seq.forEach((pad, i) => {
        timers.current.push(
          window.setTimeout(
            () => {
              setLit(pad);
              if (!muted) playNote(pad);
            },
            600 + i * (LIT + GAP),
          ),
        );
        timers.current.push(
          window.setTimeout(() => setLit(undefined), 600 + i * (LIT + GAP) + LIT),
        );
      });

      timers.current.push(
        window.setTimeout(() => setPhase("input"), 600 + seq.length * (LIT + GAP)),
      );
    },
    [muted],
  );

  const nextRound = useCallback(
    (seq: number[]) => {
      const grown = [...seq, Math.floor(Math.random() * PADS.length)];
      setOrder(grown);
      replay(grown);
    },
    [replay],
  );

  const start = () => {
    setWrong(undefined);
    setOrder([]);
    nextRound([]);
  };

  function tap(pad: number) {
    if (phase !== "input") return;

    if (pad !== order[at]) {
      clearTimers();
      setWrong(pad);
      setPhase("over");
      if (!muted) playWrong();
      navigator.vibrate?.([20, 60, 20]);
      // 틀린 판은 세지 않는다. 직전까지 통과한 판이 기록이다.
      const cleared = order.length - 1;
      void db.meta.get(BEST_KEY).then((row) => {
        if (cleared > (((row?.value as number) ?? 0) as number)) {
          void writeSetting(BEST_KEY, cleared);
        }
      });
      return;
    }

    setLit(pad);
    if (!muted) playNote(pad);
    navigator.vibrate?.(8);
    timers.current.push(window.setTimeout(() => setLit(undefined), 180));
    const next = at + 1;
    setAt(next);

    if (next >= order.length) {
      setPhase("showing");
      if (!muted) timers.current.push(window.setTimeout(playClear, 220));
      timers.current.push(window.setTimeout(() => nextRound(order), 900));
    }
  }

  const cleared = Math.max(0, order.length - 1);

  return (
    <>
      <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
        <Link to="/" className="justify-self-start text-base text-ink-soft">
          ‹ 선반
        </Link>
        <h1 className="font-display text-lg">순서 외우기</h1>
        <span className="justify-self-end text-xs text-ink-faint tabular-nums">
          {best ? `최고 ${best}판` : ""}
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 pb-4">
        <p className="mb-1 font-display text-2xl tabular-nums">
          {phase === "ready" ? "준비" : phase === "over" ? `${cleared}판` : `${round}번`}
        </p>
        <p className="mb-6 h-5 text-sm text-ink-soft">
          {phase === "showing"
            ? "잘 보세요"
            : phase === "input"
              ? `${at}/${round}`
              : phase === "over"
                ? "여기까지!"
                : "반짝인 순서대로 누르면 돼요"}
        </p>

        <div className="grid w-full max-w-[320px] grid-cols-3 gap-2.5">
          {PADS.map((pad, i) => {
            const on = lit === i;
            const bad = wrong === i;
            return (
              <motion.button
                key={pad.shape + pad.color}
                type="button"
                aria-label={`${i + 1}번 젤리`}
                disabled={phase !== "input"}
                onClick={() => tap(i)}
                animate={{ scale: on ? 1.09 : 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 22 }}
                className="flex aspect-square items-center justify-center rounded-3xl transition-[background-color,box-shadow] duration-150"
                style={{
                  backgroundColor: bad ? "var(--accent-bg)" : JELLY_TINTS[pad.color],
                  boxShadow: on
                    ? "0 0 0 3px var(--accent), 0 8px 22px rgba(59,36,48,.18)"
                    : bad
                      ? "0 0 0 3px var(--accent)"
                      : "none",
                  // 켜졌을 때만 또렷하고, 평소엔 한 톤 가라앉아 있어야 반짝임이 보인다
                  opacity: phase === "showing" && !on ? 0.5 : 1,
                }}
              >
                <Jelly shape={pad.shape} color={pad.color} size="58%" />
              </motion.button>
            );
          })}
        </div>

        {phase === "ready" || phase === "over" ? (
          <div className="mt-7 flex flex-col items-center gap-2">
            {phase === "over" ? (
              <p className="text-sm text-ink-soft">
                {cleared > 0 && cleared >= (best ?? 0)
                  ? "최고 기록이에요!"
                  : `최고 기록 ${best ?? 0}판`}
              </p>
            ) : null}
            <button
              type="button"
              onClick={start}
              className="rounded-2xl bg-accent px-7 py-3 font-display text-base text-white transition active:scale-95"
            >
              {phase === "over" ? "다시 하기" : "시작하기"}
            </button>
          </div>
        ) : null}
      </main>
    </>
  );
}
