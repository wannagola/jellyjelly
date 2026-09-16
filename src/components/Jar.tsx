import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useMemo } from "react";
import { Jelly } from "./Jelly";
import type { PileItem } from "../lib/pile";

/** 쏟아진 더미의 끝이 가서 붙는 자리 */
const WALL_L = 0.16;
const WALL_R = 0.84;
/** 쏟아지면서 가로 폭이 이만큼으로 줄어든다 */
const SQUEEZE = 0.62;

/**
 * 유리병. 크기는 CSS가 정하고 내부는 전부 % 로 배치해서
 * 어떤 화면 폭에서도 같은 더미가 나온다.
 *
 * 층 순서가 중요하다 - 젤리 더미(.jar-pile) 위에 반사층(.jar-glare)이
 * 덮여야 젤리가 유리 '앞'이 아니라 '안'에 있는 것처럼 보인다.
 */
export function Jar({
  items,
  className = "w-[min(272px,72vw)]",
  /** 젤리 지름, 병 너비 대비 */
  jellyRatio = 0.16,
  /** 이 키의 젤리는 위에서 떨어져 들어온다 */
  dropKey,
  /** 병을 톡 쳤을 때. 주면 병이 눌리는 버튼이 된다. */
  onShake,
  /** 값이 바뀔 때마다 병이 한 번 흔들린다 */
  shakeToken = 0,
  /** 선반처럼 병을 여러 개 그릴 때. 애니메이션 없이 정적으로 그린다. */
  quiet = false,
  /** 젤리 한 알을 눌렀을 때. 키는 그 젤리를 담은 기록의 id다. */
  onPick,
  /** -1(왼쪽) ~ 1(오른쪽). 폰을 기울인 만큼 젤리가 그쪽으로 쏠린다. */
  tilt = 0,
}: {
  items: PileItem[];
  className?: string;
  jellyRatio?: number;
  dropKey?: string;
  onShake?: () => void;
  shakeToken?: number;
  quiet?: boolean;
  onPick?: (key: string) => void;
  tilt?: number;
}) {
  const still = useReducedMotion();
  const size = `${jellyRatio * 100}%`;
  const [scope, animate] = useAnimate();

  // 더미의 양 끝. 기운 쪽 끝이 벽에 딱 붙어야 '쏟아졌다'로 보인다.
  const edges = useMemo(() => {
    let lo = 1;
    let hi = 0;
    for (const it of items) {
      lo = Math.min(lo, it.x);
      hi = Math.max(hi, it.x);
    }
    return { lo, hi };
  }, [items]);

  /**
   * 기울였을 때 이 알이 가는 자리.
   *
   * 다 같이 옆으로 조금씩 밀면 더미가 움찔하고 만다. 진짜 병을 기울이면
   * 젤리가 한쪽 벽으로 쏟아져 쌓인다. 그래서 두 가지를 같이 한다 -
   * 더미의 기운 쪽 끝을 벽에 붙이고, 가로로 퍼진 폭을 좁힌다.
   *
   * 그리고 위에 얹힌 알일수록 더 멀리 간다. 바닥 알은 위에 눌려 있어서
   * 조금밖에 못 움직인다. 다 똑같이 옮기면 더미가 아니라 그림 한 장이
   * 통째로 미끄러지는 것처럼 보인다.
   */
  const slide = (it: PileItem) => {
    if (!tilt || still) return it.x;
    const k = Math.min(1, Math.abs(tilt));
    const lift = Math.min(1, Math.max(0, (0.95 - it.y) / 0.45));

    const wall = tilt > 0 ? WALL_R : WALL_L;
    const lead = tilt > 0 ? edges.hi : edges.lo;
    const poured = wall + (it.x - lead) * SQUEEZE + tilt * 0.1 * lift;

    // 기울기를 0 으로 되돌렸을 때 제자리로 이어지도록 섞는다
    const x = it.x * (1 - k) + poured * k;
    return Math.min(0.92, Math.max(0.08, x));
  };
  const lean = (it: PileItem) => (still ? it.rotate : it.rotate + tilt * 13);

  // 흔들림은 명령형으로 쏜다. animate prop 에 같은 키프레임을 다시 넣어봐야
  // 값이 안 바뀐 것으로 보고 두 번째부터는 아무 일도 일어나지 않는다.
  useEffect(() => {
    if (shakeToken === 0 || still || !scope.current) return;
    animate(
      scope.current,
      { rotate: [0, -3.2, 2.6, -1.6, 0.8, 0], x: [0, -5, 4, -2, 1, 0] },
      { duration: 0.55, ease: "easeOut" },
    );
  }, [shakeToken, still, animate, scope]);

  const jar = (
    <motion.div
      ref={scope}
      className={`jar ${className}`}
      style={{ aspectRatio: "200 / 275" }}
    >
      <div className="jar-cast" />
      <div className="jar-lid" />
      <div className="jar-neck" />
      <div className="jar-glass">
        {onShake ? (
          <button type="button" className="jar-shake" aria-label="병 흔들기" onClick={onShake} />
        ) : null}
        <div className="jar-pile">
          {quiet
            ? items.map((it) => (
                <span
                  key={it.key}
                  style={{
                    left: `${it.x * 100}%`,
                    top: `${it.y * 100}%`,
                    width: size,
                  }}
                >
                  <span
                    className="block"
                    style={{ transform: `rotate(${it.rotate}deg)` }}
                  >
                    <JellyHit onPick={onPick} pickKey={it.key}>
                      <Jelly shape={it.shape} color={it.color} size="100%" />
                    </JellyHit>
                  </span>
                </span>
              ))
            : items.map((it) => {
                const falling = it.key === dropKey;
                return (
                  <motion.span
                    key={it.key}
                    style={{ width: size }}
                    initial={
                      falling
                        ? { left: `${slide(it) * 100}%`, top: "-30%", opacity: 0 }
                        : {
                            left: `${slide(it) * 100}%`,
                            top: `${it.y * 100}%`,
                            opacity: 1,
                          }
                    }
                    animate={{
                      left: `${slide(it) * 100}%`,
                      top: `${it.y * 100}%`,
                      opacity: 1,
                    }}
                    transition={
                      still
                        ? { duration: 0 }
                        : falling
                          ? { type: "spring", stiffness: 380, damping: 17 }
                          : { type: "spring", stiffness: 210, damping: 20 }
                    }
                  >
                    {/* 회전과 찌그러짐은 안쪽에서. 바깥은 자리만 잡는다. */}
                    <motion.span
                      className="block"
                      initial={
                        falling
                          ? { rotate: lean(it) - 40, scale: 0.85 }
                          : false
                      }
                      animate={
                        still
                          ? { rotate: it.rotate, scale: 1 }
                          : falling
                            ? {
                                rotate: lean(it),
                                scaleX: [0.85, 1.18, 0.94, 1.04, 1],
                                scaleY: [0.85, 0.8, 1.12, 0.96, 1],
                              }
                            : { rotate: lean(it), scale: 1 }
                      }
                      transition={
                        still
                          ? { duration: 0 }
                          : falling
                            ? {
                                duration: 0.62,
                                times: [0, 0.55, 0.72, 0.88, 1],
                                ease: "easeOut",
                              }
                            : { type: "spring", stiffness: 210, damping: 18 }
                      }
                    >
                      <JellyHit onPick={onPick} pickKey={it.key}>
                        <Jelly shape={it.shape} color={it.color} size="100%" />
                      </JellyHit>
                    </motion.span>
                  </motion.span>
                );
              })}
        </div>
        <div className="jar-glare" />
      </div>
      <div className="jar-shine" />
      <div className="jar-shine2" />
      <div className="jar-shine-r" />
      <div className="jar-floor" />
    </motion.div>
  );

  return jar;
}

/** 젤리 한 알의 누를 수 있는 껍데기. 누를 데가 없으면 그냥 통과시킨다. */
function JellyHit({
  onPick,
  pickKey,
  children,
}: {
  onPick?: (key: string) => void;
  pickKey: string;
  children: React.ReactNode;
}) {
  if (!onPick) return <>{children}</>;

  return (
    <button
      type="button"
      aria-label="이 젤리 기록 보기"
      onClick={() => onPick(pickKey)}
      className="block w-full appearance-none transition active:scale-90"
    >
      {children}
    </button>
  );
}
