import { motion } from "motion/react";
import { useMemo } from "react";
import type { JellyColor } from "../data/types";
import { JELLY_COLORS } from "../lib/jelly";

export type DrawPhase = "idle" | "turn" | "drop" | "open" | "done";

const COLORS: JellyColor[] = [
  "grape",
  "berry",
  "green",
  "orange",
  "lemon",
  "soda",
  "peach",
  "cola",
  "grape",
  "berry",
  "green",
];

/** 같은 씨앗이면 같은 배치가 나오는 난수 */
function makeRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const CAPSULE_COUNT = 11;

/**
 * 돔은 원이라 네모난 격자로 흩뿌리면 가장자리에서 잘린다.
 * 중심에서 각도와 거리를 뽑아 원 안에만 놓는다. 거리에 제곱근을 씌워야
 * 가운데로 몰리지 않고 고르게 퍼진다.
 */
function arrangement(seed: number) {
  const rnd = makeRandom(seed);
  return Array.from({ length: CAPSULE_COUNT }, () => {
    const angle = rnd() * Math.PI * 2;
    const radius = (0.08 + Math.sqrt(rnd()) * 0.25) * 100;
    return {
      x: 50 + Math.cos(angle) * radius,
      // 가만히 있을 땐 아래로 조금 쏠려야 쌓인 것처럼 보인다
      y: 52 + Math.sin(angle) * radius * 0.92,
    };
  });
}

/**
 * 캡슐 한 알. 위는 반투명, 아래는 색.
 * 높이는 aspect-ratio 로 잡는다 - "100%" 를 넘겨받았을 때
 * 부모에 높이가 없으면 납작해져서 안 보인다.
 */
export function Capsule({ color, size }: { color: JellyColor; size: string }) {
  return (
    <span
      className="relative block overflow-hidden rounded-full"
      style={{ width: size, aspectRatio: "1", background: JELLY_COLORS[color] }}
    >
      <span className="absolute inset-x-0 top-0 block h-1/2 rounded-t-full bg-white/70" />
      <span className="absolute top-[14%] left-[22%] block size-[18%] rounded-full bg-white/80" />
    </span>
  );
}

/**
 * 뽑기 기계. 레버를 돌리면 캡슐이 투출구로 떨어진다.
 * 기계는 그림만 그리고, 무엇이 뽑혔는지는 화면이 정한다.
 */
export function GachaMachine({
  phase,
  color,
  onTurn,
  mixSeed,
  className = "w-[min(260px,68vw)]",
}: {
  phase: DrawPhase;
  color: JellyColor;
  onTurn: () => void;
  /** 뽑을 때마다 바뀐다. 섞이고 나면 배치도 달라져 있어야 진짜 섞인 것처럼 보인다. */
  mixSeed: number;
  className?: string;
}) {
  const turning = phase !== "idle";

  // 섞이는 동안 거쳐 갈 배치들과, 멎었을 때의 배치
  const spots = useMemo(() => {
    const churn = [0, 1, 2, 3].map((step) => arrangement(mixSeed * 31 + step * 7 + 1));
    const rest = arrangement(mixSeed * 31 + 41);
    return { churn: [...churn, rest], rest };
  }, [mixSeed]);

  return (
    <div className={`gacha ${className}`}>
      <div className="gacha-dome">
        {COLORS.map((color, i) => {
          const rest = spots.rest[i];
          return (
            <motion.span
              key={color + String(i)}
              className="absolute block -translate-x-1/2 -translate-y-1/2"
              style={{ width: "17%" }}
              initial={{ left: `${rest.x}%`, top: `${rest.y}%` }}
              animate={
                phase === "turn"
                  ? {
                      left: spots.churn.map((step) => `${step[i].x}%`),
                      top: spots.churn.map((step) => `${step[i].y}%`),
                    }
                  : { left: `${rest.x}%`, top: `${rest.y}%` }
              }
              transition={
                phase === "turn"
                  ? { duration: 1.15, ease: "easeInOut" }
                  : { type: "spring", stiffness: 180, damping: 16 }
              }
            >
              <motion.span
                className="block"
                animate={{ rotate: phase === "turn" ? [0, 200, 420, 640, 720] : 0 }}
                transition={{ duration: 1.15, ease: "easeInOut" }}
              >
                <Capsule color={color} size="100%" />
              </motion.span>
            </motion.span>
          );
        })}
      </div>

      <div className="gacha-collar" />
      <div className="gacha-body" />

      {/* 떨어지는 캡슐. 돔 아래에서 시작해 투출구로 내려온다. */}
      {phase === "drop" || phase === "open" || phase === "done" ? (
        <motion.span
          className="absolute left-1/2 z-[1] block"
          // 돔 안쪽에서 시작해 투출구 자리까지 내려와 한 번 튄다
          style={{ width: "17%", marginLeft: "-8.5%", top: "76%" }}
          initial={{ y: "-420%", opacity: 0, rotate: -30 }}
          animate={{ y: ["-420%", "18%", "-8%", "0%"], opacity: 1, rotate: [-30, 14, -6, 0] }}
          transition={{ duration: 0.75, times: [0, 0.62, 0.84, 1], ease: "easeOut" }}
        >
          <Capsule color={color} size="100%" />
        </motion.span>
      ) : null}

      <div className="gacha-flap" />
      <div className="gacha-slot" />

      <button
        type="button"
        className="gacha-knob"
        aria-label="레버 돌리기"
        onClick={onTurn}
        disabled={turning}
      >
        <motion.span
          className="grid size-full place-items-center"
          animate={{ rotate: turning ? 360 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <i />
          <i />
        </motion.span>
      </button>

      <div className="gacha-foot" />
    </div>
  );
}
