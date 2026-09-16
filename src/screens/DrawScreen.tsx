import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Capsule, type DrawPhase, GachaMachine } from "../components/GachaMachine";
import { Jelly as JellyIcon } from "../components/Jelly";
import { JellyFace } from "../components/JellyFace";
import { db, startEating } from "../data/db";
import { type DrawResult, drawJelly } from "../lib/draw";
import { useGoBack } from "../lib/goBack";
import { useSettings } from "../lib/settings";
import { playShake } from "../lib/sound";
import { useCurrentMonth } from "../lib/useCurrentMonth";

/** 못 고르겠을 때. 레버를 돌리면 오늘 먹을 젤리가 투출구로 나온다. */
export function DrawScreen() {
  const navigate = useNavigate();
  const goBack = useGoBack("/recommend");
  const thisMonth = useCurrentMonth();
  const settings = useSettings();

  const data = useLiveQuery(
    async () => ({ jellies: await db.jellies.toArray(), entries: await db.entries.toArray() }),
    [],
  );

  const [phase, setPhase] = useState<DrawPhase>("idle");
  const [result, setResult] = useState<DrawResult>();
  // 뽑을 때마다 돔 안의 배치가 달라진다
  const [mixSeed, setMixSeed] = useState(1);
  const timers = useRef<number[]>([]);

  function turn() {
    if (!data || phase !== "idle") return;
    const picked = drawJelly(data.jellies, data.entries);
    if (!picked) return;

    setResult(picked);
    setMixSeed((n) => n + 1);
    setPhase("turn");
    if (!settings?.muted) playShake(10);
    navigator.vibrate?.([10, 60, 14]);

    // 레버가 돌고, 캡슐이 떨어지고, 열린다
    timers.current.forEach(clearTimeout);
    // 섞이고(1.15초) → 떨어지고(0.75초) → 열린다
    timers.current = [
      setTimeout(() => setPhase("drop"), 1180),
      setTimeout(() => setPhase("open"), 1900),
      setTimeout(() => setPhase("done"), 2280),
    ] as unknown as number[];
  }

  function again() {
    timers.current.forEach(clearTimeout);
    setPhase("idle");
    setResult(undefined);
  }

  async function eatIt() {
    if (!result) return;
    await startEating(result.jelly.id);
    navigate(`/month/${thisMonth}`, {
      replace: true,
      state: { toast: `${result.jelly.name} 먹는 중으로 담았어요` },
    });
  }

  const empty = data && data.jellies.length === 0;

  return (
    <>
      <header className="flex flex-none items-center justify-between gap-2 px-5 pt-3 pb-2.5">
        <button type="button" onClick={goBack} className="text-base text-ink-soft">
          ‹ 뒤로
        </button>
        <h1 className="font-display text-lg">젤리 뽑기</h1>
        <span className="w-10" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5 pb-6">
        {empty ? (
          <p className="text-center text-base leading-relaxed text-ink-soft">
            도감이 비어 있어요
            <br />
            젤리를 먼저 하나 추가해 주세요
          </p>
        ) : (
          <>
            <GachaMachine
              phase={phase}
              color={result?.jelly.color ?? "grape"}
              mixSeed={mixSeed}
              onTurn={turn}
            />

            <p className="mt-5 h-5 text-sm text-ink-soft">
              {phase === "idle" ? "손잡이를 돌려보세요" : phase === "done" ? "" : "섞는 중…"}
            </p>
          </>
        )}
      </main>

      <AnimatePresence>
        {phase === "done" && result ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/30"
            />
            <motion.div
              role="dialog"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] rounded-t-3xl bg-surface px-5 pt-3 pb-7 text-center shadow-[0_-8px_28px_rgba(59,36,48,.16)]"
            >
              <span className="mx-auto mb-4 block h-1 w-9 rounded-full bg-line" />

              {/* 캡슐이 갈라지며 젤리가 나온다 */}
              <div className="relative mx-auto mb-3 grid size-28 place-items-center">
                <motion.span
                  className="absolute inset-x-0 top-0 block h-1/2 overflow-hidden"
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -34, opacity: 0, rotate: -16 }}
                  transition={{ delay: 0.12, duration: 0.42, ease: "easeOut" }}
                >
                  <span className="block size-28">
                    <Capsule color={result.jelly.color} size="100%" />
                  </span>
                </motion.span>
                <motion.span
                  className="absolute inset-x-0 bottom-0 block h-1/2 overflow-hidden"
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: 34, opacity: 0, rotate: 16 }}
                  transition={{ delay: 0.12, duration: 0.42, ease: "easeOut" }}
                >
                  <span className="-mt-14 block size-28">
                    <Capsule color={result.jelly.color} size="100%" />
                  </span>
                </motion.span>

                <motion.span
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: [0.2, 1.18, 1], opacity: 1 }}
                  transition={{ delay: 0.24, duration: 0.5, ease: "easeOut" }}
                >
                  {result.jelly.photo ? (
                    <JellyFace jelly={result.jelly} size={92} radius={28} />
                  ) : (
                    <JellyIcon shape={result.jelly.shape} color={result.jelly.color} size={82} />
                  )}
                </motion.span>
              </div>

              <p className="font-display text-xl">{result.jelly.name}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {result.jelly.brand ? `${result.jelly.brand} · ` : ""}
                {result.reason}
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={again}
                  className="flex-1 rounded-2xl bg-bg py-3.5 font-display text-lg text-ink-soft transition active:scale-[.98]"
                >
                  다시 뽑기
                </button>
                <button
                  type="button"
                  onClick={eatIt}
                  className="flex-[1.4] rounded-2xl bg-accent py-3.5 font-display text-lg text-white transition active:scale-[.98]"
                >
                  이거 먹을래요
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
