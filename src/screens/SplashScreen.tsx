import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Jar } from "../components/Jar";
import { buildPile, jellyRatioFor } from "../lib/pile";

/**
 * 첫 화면에 담기는 열여덟 알.
 *
 * 여덟 알이면 한 줄에 다 들어가서 바닥에 납작하게 깔린다. 한 줄에 여덟
 * 자리가 나는데 알 지름이 줄 폭보다 커서, 다 옆으로 겹쳐 찌부된 띠가 된다.
 * 층이 쌓여야 더미로 보인다. 8 + 7 + 3 으로 세 층이 올라가는 수가 열여덟이다.
 */
const SAMPLE = [
  { id: "s01", shape: "bear", color: "orange" },
  { id: "s02", shape: "ring", color: "berry" },
  { id: "s03", shape: "cube", color: "grape" },
  { id: "s04", shape: "worm", color: "green" },
  { id: "s05", shape: "heart", color: "peach" },
  { id: "s06", shape: "bottle", color: "cola" },
  { id: "s07", shape: "cube", color: "soda" },
  { id: "s08", shape: "ring", color: "lemon" },
  { id: "s09", shape: "bear", color: "berry" },
  { id: "s10", shape: "worm", color: "grape" },
  { id: "s11", shape: "heart", color: "berry" },
  { id: "s12", shape: "cube", color: "green" },
  { id: "s13", shape: "ring", color: "orange" },
  { id: "s14", shape: "bottle", color: "soda" },
  { id: "s15", shape: "bear", color: "lemon" },
  { id: "s16", shape: "worm", color: "peach" },
  { id: "s17", shape: "cube", color: "berry" },
  { id: "s18", shape: "ring", color: "grape" },
] as const;

/** 전체 길이 (ms). 이 안에서 젤리가 다 떨어지고 이름이 뜨고 병이 한 번 흔들린다. */
export const SPLASH_MS = 8000;
/** 첫 알이 떨어지는 때와 알 사이 간격 */
const FIRST_DROP = 420;
const GAP = 330;
/** 한 알이 떨어져 자리를 잡기까지 (Jar 의 낙하 애니메이션 길이) */
const LAND = 620;
/** 걷히는 데 걸리는 시간 */
const FADE = 500;

/**
 * 시작 화면.
 *
 * 3초는 가만히 기다리기에는 길다. 그래서 기다리는 동안 이 앱이 무슨 앱인지를
 * 보여준다 - 빈 병에 젤리가 한 알씩 떨어져 쌓인다. 앱을 쓰는 동안 계속 보게 될
 * 바로 그 동작이라, 설명 없이도 뭘 하는 앱인지 알게 된다.
 *
 * 자리는 여덟 알을 다 깐 더미에서 미리 뽑아 둔다. 개수에 맞춰 그때그때 계산하면
 * 한 알 떨어질 때마다 이미 있던 알들이 자리를 옮겨서 더미가 들썩인다.
 *
 * 그리고 아무 데나 누르면 건너뛴다. 매번 3초를 다시 볼 이유는 없다.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const still = useReducedMotion();
  // 한 번만 만든다. 매 렌더 새로 만들면 타이머 effect 가 계속 다시 걸린다.
  const pile = useMemo(() => buildPile([...SAMPLE], 7), []);
  // 몇 알까지 떨어졌나. 움직임을 줄이라고 한 기기에는 처음부터 다 채워 둔다.
  const [dropped, setDropped] = useState(() => (still ? pile.length : 0));
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (still) return;
    const timers = pile.map((_, i) =>
      window.setTimeout(() => setDropped(i + 1), FIRST_DROP + i * GAP),
    );
    // 다 담기고 나면 병을 한 번 톡. 끝까지 보는 사람에게 줄 마지막 한 박자다.
    const settle = FIRST_DROP + (pile.length - 1) * GAP + LAND;
    timers.push(window.setTimeout(() => setShake(1), settle));
    return () => timers.forEach(clearTimeout);
  }, [still, pile]);

  return (
    <motion.button
      type="button"
      aria-label="건너뛰기"
      onClick={onDone}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: FADE / 1000, delay: (SPLASH_MS - FADE) / 1000 }}
      className="fixed inset-0 z-[100] flex w-full flex-col items-center justify-center bg-bg"
    >
      <Jar
        className="w-[min(212px,54vw)]"
        jellyRatio={jellyRatioFor(SAMPLE.length)}
        items={pile.slice(0, dropped)}
        dropKey={dropped > 0 ? pile[dropped - 1].key : undefined}
        shakeToken={shake}
      />

      <motion.div
        className="mt-7 flex flex-col items-center"
        initial={still ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.75 }}
      >
        <h1 className="font-display text-3xl">젤리젤리</h1>
        <p className="mt-1.5 text-sm text-ink-faint">먹은 젤리를 병에 담아 모아요</p>
      </motion.div>

      {/* 넘어갈 수 있다는 걸 말해주지 않으면 5초를 꼼짝없이 기다린다 */}
      <motion.p
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.9 }}
        className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+2.5rem)] text-tiny text-ink-faint"
      >
        아무 데나 누르면 바로 시작해요
      </motion.p>
    </motion.button>
  );
}
