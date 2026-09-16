import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { Link } from "react-router";
import { db, writeSetting } from "../data/db";
import { playClear, playNote, playWrong } from "../lib/chime";
import {
  type Move,
  type Pose,
  type Puzzle,
  MOVE_NAME,
  MOVE_SHORT,
  START,
  applyAll,
  makePuzzle,
  samePose,
} from "../lib/fold";
import { useSettings } from "../lib/settings";

const BEST_KEY = "foldBest";
const RULES_KEY = "foldRulesSeen";
const LIVES = 3;

/**
 * 손질할 젤리 한 알.
 *
 * 돌리고 뒤집는 게 보이려면 도형이 어느 쪽으로도 안 닮아야 한다. 동그랗거나
 * 좌우가 같으면 뒤집어도 그대로라 문제가 성립하지 않는다. 그래서 한 입
 * 베어 문 자국을 한쪽 위에만 내고, 반짝이는 점은 반대쪽에 찍었다.
 */
function Bitten({ pose, tone }: { pose: Pose; tone: string }) {
  return (
    <svg viewBox="0 0 100 100" className="block size-full" aria-hidden>
      <title>젤리</title>
      <defs>
        <mask id={`bite-${tone.replace("#", "")}`}>
          <rect width="100" height="100" fill="#fff" />
          {/* 베어 문 자국 - 오른쪽 위 한 곳에만 */}
          <circle cx="86" cy="20" r="21" fill="#000" />
        </mask>
      </defs>
      <g
        style={{
          transformOrigin: "50% 50%",
          transform: `rotate(${pose.turn * 45}deg) scaleX(${pose.flipped ? -1 : 1})`,
          transition: "transform .32s cubic-bezier(.34,1.3,.5,1)",
        }}
      >
        <g mask={`url(#bite-${tone.replace("#", "")})`}>
          <rect x="12" y="12" width="76" height="76" rx="22" fill={tone} />
          {/* 아래 왼쪽 모서리만 각지게 잘라 회전 방향이 더 또렷하게 */}
          <path d="M12 62 L38 88 L12 88 Z" fill={tone} />
        </g>
        <ellipse cx="34" cy="38" rx="11" ry="8" fill="#fff" opacity=".55" transform="rotate(-24 34 38)" />
        <circle cx="62" cy="68" r="5" fill="#fff" opacity=".3" />
      </g>
    </svg>
  );
}

function Panel({ pose, tone, label }: { pose: Pose; tone: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <span className="text-tiny text-ink-faint">{label}</span>
      <div className="w-full rounded-2xl bg-surface p-2">
        <Bitten pose={pose} tone={tone} />
      </div>
    </div>
  );
}

export function FoldScreen() {
  const settings = useSettings();
  const best = useLiveQuery(async () => ((await db.meta.get(BEST_KEY))?.value as number) ?? 0, []);
  const rulesSeen = useLiveQuery(
    async () => ((await db.meta.get(RULES_KEY))?.value as boolean) ?? false,
    [],
  );

  const [puzzle, setPuzzle] = useState<Puzzle>();
  const [moves, setMoves] = useState<Move[]>([]);
  const [solved, setSolved] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [mark, setMark] = useState<{ ok: boolean; why: string }>();
  const [over, setOver] = useState(false);

  const muted = Boolean(settings?.muted);
  const now = applyAll(moves);

  const ask = useCallback((nth: number) => {
    setPuzzle(makePuzzle(nth, Math.floor(Math.random() * 1e9)));
    setMoves([]);
    setMark(undefined);
  }, []);

  const start = () => {
    setSolved(0);
    setLives(LIVES);
    setOver(false);
    ask(0);
  };

  function push(move: Move) {
    if (!puzzle || mark) return;
    setMoves((prev) => [...prev, move]);
    if (!muted) playNote(moves.length % 6, 0.22);
    navigator.vibrate?.(6);
  }

  function submit() {
    if (!puzzle || mark || moves.length === 0) return;
    const arrived = samePose(now, puzzle.target);
    const ok = arrived && moves.length === puzzle.best;

    if (ok) {
      const next = solved + 1;
      setSolved(next);
      setMark({ ok: true, why: `${puzzle.best}번 만에 맞췄어요!` });
      if (!muted) playClear();
      navigator.vibrate?.([10, 40, 14]);
      window.setTimeout(() => ask(next), 1100);
      return;
    }

    setMark({
      ok: false,
      why: arrived
        ? `모양은 맞는데 ${moves.length}번 썼어요. ${puzzle.best}번이면 됩니다.`
        : "아직 그 모양이 아니에요",
    });
    if (!muted) playWrong();
    navigator.vibrate?.([18, 50, 18]);

    const left = lives - 1;
    setLives(Math.max(0, left));
    if (left <= 0) {
      setOver(true);
      void db.meta.get(BEST_KEY).then((row) => {
        if (solved > (((row?.value as number) ?? 0) as number)) void writeSetting(BEST_KEY, solved);
      });
      return;
    }
    // 같은 문제를 다시 주면 아까 눌러본 것에 하나씩 더해 보며 맞추게 된다.
    // 머릿속에서 굴려보는 게임이니 한 문제에 한 번뿐이어야 한다.
    window.setTimeout(() => ask(solved), 2200);
  }

  if (rulesSeen === false) {
    return (
      <>
        <Head best={best} />
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-7 pb-6">
          <div className="w-full max-w-[340px] rounded-3xl bg-surface p-6">
            <h2 className="mb-4 text-center font-display text-xl">가장 적은 횟수로</h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              왼쪽 젤리를 오른쪽 젤리 모양으로 만드세요. 아래 버튼을 눌러 돌리거나 뒤집을
              순서를 짜고, 다 짰으면 제출합니다.
            </p>
            <p className="mt-3 rounded-2xl bg-accent-bg px-4 py-3 text-sm leading-relaxed text-accent">
              <b className="font-medium">돌아가는 모습은 안 보여줘요.</b> 머릿속으로 굴려 봐야
              합니다. 고른 순서는 화면에 쌓이니 외울 필요는 없어요.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              모양만 맞으면 안 되고 정해진 최소 횟수여야 정답입니다. 몇 번이면 되는지는 미리
              알려드려요. 판이 올라가면 쓸 수 있는 버튼이 줄어듭니다.
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
        {puzzle && !over ? (
          <div className="flex w-full max-w-[360px] flex-col items-center">
            <div className="flex w-full items-end gap-2">
              <Panel pose={START} tone="#C9BCD4" label="변경 전" />
              <span className="pb-6 text-lg text-ink-faint">→</span>
              <Panel pose={puzzle.target} tone="#C9BCD4" label="변경 후" />
            </div>

            <p className="mt-4 text-sm text-ink-soft">
              <b className="font-medium text-accent">{puzzle.best}번</b>이면 됩니다 · 지금{" "}
              <b className="font-medium tabular-nums">{moves.length}번</b>
            </p>

            {/*
              돌아가는 모양은 안 보여준다. 보여주면 머릿속에서 굴려볼 이유가 없어져서,
              버튼을 아무렇게나 눌러보다 맞으면 제출하는 게임이 된다.
              대신 고른 것을 순서대로 쌓아 보여준다 - 뭘 했는지는 기억할 필요가 없어야 한다.
            */}
            <div className="mt-3 flex min-h-[3.4rem] w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-accent-bg px-3 py-2.5">
              {moves.length === 0 ? (
                <span className="text-xs text-ink-faint">아래에서 골라 보세요</span>
              ) : (
                moves.map((move, i) => (
                  <span
                    key={`${move}-${i}`}
                    className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft"
                  >
                    <b className="mr-1 font-medium text-accent tabular-nums">{i + 1}</b>
                    {MOVE_SHORT[move]}
                  </span>
                ))
              )}
            </div>

            {/* 제출하고 나서야 어떻게 됐는지 보여준다. 이건 배우라고 주는 것이다. */}
            {mark ? (
              <div className="mt-3 flex items-end gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-tiny text-ink-faint">이렇게 됐어요</span>
                  <div className="w-[26vw] max-w-[96px] rounded-2xl bg-surface p-2">
                    <Bitten pose={now} tone={mark.ok ? "#7CC36A" : "#EF5D7A"} />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-tiny text-ink-faint">변경 후</span>
                  <div className="w-[26vw] max-w-[96px] rounded-2xl bg-surface p-2">
                    <Bitten pose={puzzle.target} tone="#C9BCD4" />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              {puzzle.gens.map((move) => (
                <motion.button
                  key={move}
                  type="button"
                  disabled={Boolean(mark)}
                  onClick={() => push(move)}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-2xl bg-surface py-3 text-sm font-medium transition disabled:opacity-50"
                >
                  {MOVE_NAME[move]}
                </motion.button>
              ))}
            </div>

            <div className="mt-2 flex w-full gap-2">
              <button
                type="button"
                disabled={Boolean(mark) || moves.length === 0}
                onClick={() => setMoves((prev) => prev.slice(0, -1))}
                className="flex-1 rounded-2xl bg-surface py-2.5 text-sm text-ink-soft transition active:scale-95 disabled:opacity-40"
              >
                되돌리기
              </button>
              <button
                type="button"
                disabled={Boolean(mark) || moves.length === 0}
                onClick={submit}
                className="flex-[2] rounded-2xl bg-accent py-2.5 font-display text-base text-white transition active:scale-95 disabled:opacity-40"
              >
                제출
              </button>
            </div>

            <p
              className={`mt-3 min-h-10 max-w-[30ch] text-center text-sm leading-snug ${
                mark ? (mark.ok ? "font-medium text-accent" : "text-ink-soft") : "text-ink-faint"
              }`}
            >
              {mark ? mark.why : "머릿속으로 굴려 보고 제출하세요"}
            </p>
          </div>
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
                왼쪽 젤리를 오른쪽 모양으로, 가장 적은 횟수로
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

function Head({ best, onRules }: { best?: number; onRules?: () => void }) {
  return (
    <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
      <Link to="/" className="justify-self-start text-base text-ink-soft">
        ‹ 선반
      </Link>
      <h1 className="font-display text-lg">돌려 맞추기</h1>
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
