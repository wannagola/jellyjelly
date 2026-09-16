import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { db, writeSetting } from "../data/db";
import type { JellyColor } from "../data/types";
import { playNote, playWrong } from "../lib/chime";
import { JELLY_COLORS } from "../lib/jelly";
import { type Cell, type Round, makeRound, normalize } from "../lib/rotate";
import { useSettings } from "../lib/settings";

const BEST_KEY = "spinBest";
const RULES_KEY = "spinRulesSeen";
const LIVES = 3;

const COLORS: JellyColor[] = ["grape", "berry", "green", "orange", "soda", "peach"];

/** 젤리 알 몇 개가 붙은 덩어리 하나 */
function Shape({ cells, span, color }: { cells: Cell[]; span: number; color: JellyColor }) {
  const placed = normalize(cells);
  const step = 100 / span;
  return (
    <span className="relative block aspect-square w-full">
      {placed.map(([x, y]) => (
        <span
          key={`${x},${y}`}
          className="absolute block rounded-[22%]"
          style={{
            left: `${x * step}%`,
            top: `${y * step}%`,
            width: `${step}%`,
            height: `${step}%`,
            // 알 사이를 살짝 띄운다. 딱 붙으면 덩어리가 아니라 한 판으로 보인다.
            transform: "scale(.88)",
            background: JELLY_COLORS[color],
          }}
        />
      ))}
    </span>
  );
}

export function SpinScreen() {
  const settings = useSettings();
  const best = useLiveQuery(async () => ((await db.meta.get(BEST_KEY))?.value as number) ?? 0, []);
  const rulesSeen = useLiveQuery(
    async () => ((await db.meta.get(RULES_KEY))?.value as boolean) ?? false,
    [],
  );

  const [round, setRound] = useState<Round>();
  const [solved, setSolved] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [mark, setMark] = useState<{ at: number; ok: boolean }>();
  const [over, setOver] = useState(false);

  const muted = Boolean(settings?.muted);
  const solvedRef = useRef(0);
  const color = COLORS[solved % COLORS.length];

  const ask = useCallback((nth: number) => {
    setRound(makeRound(nth, Math.floor(Math.random() * 1e9)));
    setMark(undefined);
  }, []);

  const start = () => {
    solvedRef.current = 0;
    setSolved(0);
    setLives(LIVES);
    setOver(false);
    ask(0);
  };

  const finish = useCallback(() => {
    setOver(true);
    const final = solvedRef.current;
    void db.meta.get(BEST_KEY).then((row) => {
      if (final > (((row?.value as number) ?? 0) as number)) void writeSetting(BEST_KEY, final);
    });
  }, []);

  function pick(at: number) {
    if (!round || mark || over) return;
    const ok = round.options[at].correct;
    setMark({ at, ok });

    if (ok) {
      solvedRef.current += 1;
      setSolved(solvedRef.current);
      if (!muted) playNote(solvedRef.current % 6, 0.34);
      navigator.vibrate?.(8);
    } else {
      if (!muted) playWrong();
      navigator.vibrate?.([18, 50, 18]);
      setLives((n) => {
        if (n - 1 <= 0) finish();
        return Math.max(0, n - 1);
      });
    }
  }

  // 답을 보여준 뒤 다음 문제로. 틀렸을 땐 어느 게 정답이었는지 볼 시간을 준다.
  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => {
    if (!mark || over) return;
    const t = window.setTimeout(() => ask(solvedRef.current), mark.ok ? 450 : 1300);
    return () => clearTimeout(t);
  }, [mark, over, ask]);
  /* oxlint-enable react/set-state-in-effect */

  if (rulesSeen === false) {
    return (
      <>
        <Header best={best} />
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-7 pb-6">
          <div className="w-full max-w-[340px] rounded-3xl bg-surface p-6">
            <h2 className="mb-4 text-center font-display text-xl">돌린 것만 정답이에요</h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              위에 젤리 덩어리가 하나 있어요. 아래 넷 중{" "}
              <b className="font-medium text-ink">그걸 돌리기만 한 것</b>을 고르면 됩니다.
            </p>
            <p className="mt-3 rounded-2xl bg-accent-bg px-4 py-3 text-sm leading-relaxed text-accent">
              <b className="font-medium">뒤집은 건 오답이에요.</b> 거울에 비친 모양은 아무리 돌려도
              원래 모양이 되지 않아요. 넷 중 하나는 꼭 이 함정입니다.
            </p>
            <button
              type="button"
              onClick={() => void writeSetting(RULES_KEY, true)}
              className="mt-6 w-full rounded-2xl bg-accent py-3 font-display text-base text-white transition active:scale-[.98]"
            >
              시작하기
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header best={best} onRules={() => void writeSetting(RULES_KEY, false)} />

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

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 pb-4">
        {round && !over ? (
          <>
            <div className="w-[38vw] max-w-[132px] rounded-3xl bg-accent-bg p-3">
              <Shape cells={round.base} span={round.span} color={color} />
            </div>
            <p className="mt-2 mb-4 text-sm text-ink-soft">이걸 돌린 것은?</p>

            <div className="grid w-full max-w-[340px] grid-cols-2 gap-2.5">
              {round.options.map((option, at) => {
                const chosen = mark?.at === at;
                // 틀렸을 때만 정답을 같이 짚어준다. 왜 틀렸는지 보여야 는다.
                const reveal = mark && !mark.ok && option.correct;
                return (
                  <motion.button
                    key={at}
                    type="button"
                    aria-label={`${at + 1}번`}
                    disabled={Boolean(mark)}
                    onClick={() => pick(at)}
                    animate={{ scale: chosen ? 0.95 : 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                    className="rounded-3xl bg-surface p-3.5"
                    style={{
                      boxShadow: chosen
                        ? mark?.ok
                          ? "0 0 0 3px var(--accent)"
                          : "0 0 0 3px #EF5D7A"
                        : reveal
                          ? "0 0 0 3px var(--accent)"
                          : "none",
                    }}
                  >
                    <Shape cells={option.cells} span={round.span} color={color} />
                  </motion.button>
                );
              })}
            </div>

            <p className="mt-3 h-5 text-sm font-medium text-accent">
              {mark ? (mark.ok ? "맞아요!" : "뒤집힌 건 아니었는지 볼까요") : ""}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            {over ? (
              <>
                <p className="font-display text-2xl">{solved}개 맞혔어요</p>
                <p className="text-sm text-ink-soft">
                  {solved > 0 && solved >= (best ?? 0)
                    ? "최고 기록이에요!"
                    : `최고 기록 ${best ?? 0}개`}
                </p>
              </>
            ) : (
              <p className="max-w-[24ch] text-sm leading-relaxed text-ink-soft">
                젤리 덩어리를 돌린 것을 고르세요
              </p>
            )}
            <button
              type="button"
              onClick={start}
              className="mt-2 rounded-2xl bg-accent px-7 py-3 font-display text-base text-white transition active:scale-95"
            >
              {over ? "다시 하기" : "시작하기"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}

function Header({ best, onRules }: { best?: number; onRules?: () => void }) {
  return (
    <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
      <Link to="/" className="justify-self-start text-base text-ink-soft">
        ‹ 선반
      </Link>
      <h1 className="font-display text-lg">도형 회전하기</h1>
      {onRules ? (
        <button
          type="button"
          onClick={onRules}
          className="justify-self-end text-xs text-ink-faint tabular-nums"
        >
          {best ? `최고 ${best}` : "규칙"}
        </button>
      ) : (
        <span className="w-10" />
      )}
    </header>
  );
}
