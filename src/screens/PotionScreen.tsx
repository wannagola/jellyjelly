import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { Link } from "react-router";
import { db, writeSetting } from "../data/db";
import { playClear, playNote, playWrong } from "../lib/chime";
import {
  type Puzzle,
  type Result,
  RESULT_NAME,
  RESULT_TONE,
  makePuzzle,
  mix,
  scoreFor,
} from "../lib/potion";
import { useSettings } from "../lib/settings";

const BEST_KEY = "potionBest";
const RULES_KEY = "potionRulesSeen";
const LIVES = 3;

/** 재료 이름. 숫자보다 글자가 기억에 남아서 머릿속에서 짝을 짓기 쉽다. */
const LABELS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ"];

interface Trial {
  pair: [number, number];
  result: Result;
}

/** 약병 하나. 색을 모르는 재료는 뿌옇게 둔다. */
function Flask({ tone, label, dim }: { tone?: string; label?: string; dim?: boolean }) {
  return (
    <span className="relative flex size-full items-center justify-center">
      <svg viewBox="0 0 48 48" className="block size-full" aria-hidden>
        <title>약병</title>
        <path
          d="M19 6h10v10.5c0 1.6.5 2.4 1.7 3.6 2.3 2.3 4 5 4 8.6v10.8c0 3.6-2.6 5.5-6 5.5H19.3c-3.4 0-6-1.9-6-5.5V28.7c0-3.6 1.7-6.3 4-8.6 1.2-1.2 1.7-2 1.7-3.6V6z"
          fill={tone ?? "#E3DAE8"}
          opacity={dim ? 0.55 : 1}
        />
        <rect x="17" y="3" width="14" height="4" rx="2" fill="rgba(59,36,48,.18)" />
        <ellipse cx="20" cy="27" rx="3" ry="4.5" fill="#fff" opacity=".4" />
      </svg>
      {/* 뿌연 병 위의 흰 글씨는 안 읽힌다. 모르는 재료일수록 이름이 잘 보여야 한다. */}
      {label ? (
        <span
          className={`absolute bottom-[14%] font-display text-base ${
            dim ? "text-ink" : "text-white drop-shadow-[0_1px_2px_rgba(59,36,48,.5)]"
          }`}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

export function PotionScreen() {
  const settings = useSettings();
  const best = useLiveQuery(async () => ((await db.meta.get(BEST_KEY))?.value as number) ?? 0, []);
  const rulesSeen = useLiveQuery(
    async () => ((await db.meta.get(RULES_KEY))?.value as boolean) ?? false,
    [],
  );

  const [puzzle, setPuzzle] = useState<Puzzle>();
  const [picked, setPicked] = useState<number[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [done, setDone] = useState<"win" | "lose">();
  const [over, setOver] = useState(false);

  const muted = Boolean(settings?.muted);

  const ask = useCallback((nth: number) => {
    setPuzzle(makePuzzle(nth, Math.floor(Math.random() * 1e9)));
    setPicked([]);
    setTrials([]);
    setDone(undefined);
  }, []);

  const start = () => {
    setScore(0);
    setLives(LIVES);
    setOver(false);
    ask(0);
  };

  function tap(at: number) {
    if (!puzzle || done) return;
    if (picked.includes(at)) {
      setPicked(picked.filter((i) => i !== at));
      return;
    }
    if (picked.length >= 2) return;
    const next = [...picked, at];
    setPicked(next);
    if (next.length === 2) window.setTimeout(() => brew(next as [number, number]), 260);
  }

  function brew(pair: [number, number]) {
    if (!puzzle) return;
    const result = mix(puzzle.hidden[pair[0]], puzzle.hidden[pair[1]]);
    const runs = [...trials, { pair, result }];
    setTrials(runs);
    setPicked([]);

    if (result === puzzle.target) {
      const got = scoreFor(runs.length, puzzle.tries);
      const total = score + got;
      setScore(total);
      setDone("win");
      if (!muted) playClear();
      navigator.vibrate?.([10, 40, 14]);
      window.setTimeout(() => ask(total), 1500);
      return;
    }

    if (!muted) playNote(runs.length % 6, 0.26);

    if (runs.length >= puzzle.tries) {
      setDone("lose");
      if (!muted) playWrong();
      navigator.vibrate?.([18, 50, 18]);
      const left = lives - 1;
      setLives(Math.max(0, left));
      if (left <= 0) {
        setOver(true);
        void db.meta.get(BEST_KEY).then((row) => {
          if (score > (((row?.value as number) ?? 0) as number)) void writeSetting(BEST_KEY, score);
        });
        return;
      }
      window.setTimeout(() => ask(score), 2000);
    }
  }

  if (rulesSeen === false) {
    return (
      <>
        <Head best={best} />
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-7 pb-6">
          <div className="w-full max-w-[340px] rounded-3xl bg-surface p-6">
            <h2 className="mb-4 text-center font-display text-xl">섞어 보면 알게 돼요</h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              재료 여섯 개의 색은 안 알려줍니다. 둘을 골라 섞으면 <b className="font-medium text-ink">섞인 색</b>이
              나오는데, 그걸 보고 재료의 색을 거꾸로 알아내는 거예요.
            </p>
            <div className="mt-3 flex justify-center gap-2 rounded-2xl bg-accent-bg px-3 py-3 text-xs">
              {(
                [
                  ["red", "blue", "purple"],
                  ["blue", "yellow", "green"],
                  ["red", "yellow", "orange"],
                ] as const
              ).map(([a, b, out]) => (
                <span key={out} className="flex items-center gap-1">
                  <Dot tone={RESULT_TONE[a]} />＋
                  <Dot tone={RESULT_TONE[b]} />＝
                  <Dot tone={RESULT_TONE[out]} />
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              같은 색끼리 섞으면 그 색 그대로예요. 목표 색이 나오면 성공이고, 적게 섞을수록
              점수가 높습니다.
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
      <Head best={best} onRules={() => void writeSetting(RULES_KEY, false)} />

      <div className="flex flex-none items-center justify-between px-5 pb-2">
        <span className="font-display text-2xl tabular-nums">{score}</span>
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
        {puzzle && !over ? (
          <div className="flex w-full max-w-[360px] flex-col items-center">
            <p className="text-sm text-ink-soft">이 색을 만들어 주세요</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="size-12">
                <Flask tone={RESULT_TONE[puzzle.target]} />
              </span>
              <span className="font-display text-xl">{RESULT_NAME[puzzle.target]}</span>
            </div>

            <p className="mt-3 text-xs text-ink-faint tabular-nums">
              남은 기회 {puzzle.tries - trials.length}번
            </p>

            {/* 섞어본 것들. 이게 유일한 단서라 지워지면 안 된다. */}
            <ul className="mt-3 flex min-h-[2.6rem] w-full flex-col gap-1.5">
              {trials.map((trial, i) => (
                <li
                  key={i}
                  className="flex items-center justify-center gap-2 rounded-xl bg-surface px-3 py-1.5 text-sm"
                >
                  <b className="font-display text-base">{LABELS[trial.pair[0]]}</b>
                  <span className="text-ink-faint">＋</span>
                  <b className="font-display text-base">{LABELS[trial.pair[1]]}</b>
                  <span className="text-ink-faint">＝</span>
                  <Dot tone={RESULT_TONE[trial.result]} />
                  <span
                    className={
                      trial.result === puzzle.target ? "font-medium text-accent" : "text-ink-soft"
                    }
                  >
                    {RESULT_NAME[trial.result]}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid w-full grid-cols-3 gap-2">
              {puzzle.hidden.map((_, at) => {
                const on = picked.includes(at);
                return (
                  <motion.button
                    key={at}
                    type="button"
                    aria-label={`${LABELS[at]} 재료`}
                    disabled={Boolean(done)}
                    onClick={() => tap(at)}
                    animate={{ scale: on ? 1.06 : 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 24 }}
                    className="flex aspect-square items-center justify-center rounded-2xl bg-surface p-2 disabled:opacity-60"
                    style={{ boxShadow: on ? "0 0 0 3px var(--accent)" : "none" }}
                  >
                    {/* 색은 끝까지 안 보여준다. 알아내는 게 이 게임이다. */}
                    <Flask label={LABELS[at]} dim />
                  </motion.button>
                );
              })}
            </div>

            <p
              className={`mt-3 min-h-10 max-w-[30ch] text-center text-sm leading-snug ${
                done === "win" ? "font-medium text-accent" : "text-ink-soft"
              }`}
            >
              {done === "win"
                ? `${trials.length}번 만에 만들었어요! +${scoreFor(trials.length, puzzle.tries)}점`
                : done === "lose"
                  ? "기회를 다 썼어요"
                  : picked.length === 1
                    ? "하나 더 고르면 섞어요"
                    : "재료 둘을 골라 보세요"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            {over ? (
              <>
                <p className="font-display text-2xl">{score}점</p>
                <p className="text-sm text-ink-soft">
                  {score > 0 && score >= (best ?? 0) ? "최고 기록이에요!" : `최고 기록 ${best ?? 0}점`}
                </p>
              </>
            ) : (
              <p className="max-w-[24ch] text-sm leading-relaxed text-ink-soft">
                섞어 보며 재료의 색을 알아내세요
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

function Dot({ tone }: { tone: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-3.5 flex-none rounded-full"
      style={{ background: tone }}
    />
  );
}

function Head({ best, onRules }: { best?: number; onRules?: () => void }) {
  return (
    <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
      <Link to="/play" className="justify-self-start text-base text-ink-soft">
        ‹ 놀이터
      </Link>
      <h1 className="font-display text-lg">마법약 만들기</h1>
      {onRules ? (
        <button
          type="button"
          onClick={onRules}
          className="justify-self-end text-xs text-ink-faint tabular-nums"
        >
          {best ? `최고 ${best}점` : "규칙"}
        </button>
      ) : (
        <span className="w-10" />
      )}
    </header>
  );
}
