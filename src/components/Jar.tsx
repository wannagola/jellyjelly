import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { Jelly } from "./Jelly";
import type { PileItem } from "../lib/pile";

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
}: {
  items: PileItem[];
  className?: string;
  jellyRatio?: number;
  dropKey?: string;
  onShake?: () => void;
  shakeToken?: number;
}) {
  const still = useReducedMotion();
  const size = `${jellyRatio * 100}%`;
  const [scope, animate] = useAnimate();

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
    <motion.div ref={scope} className={`jar ${className}`} style={{ aspectRatio: "200 / 275" }}>
      <div className="jar-cast" />
      <div className="jar-lid" />
      <div className="jar-neck" />
      <div className="jar-glass">
        <div className="jar-pile">
          {items.map((it) => {
            const falling = it.key === dropKey;
            return (
              <motion.span
                key={it.key}
                style={{ width: size }}
                initial={
                  falling
                    ? { left: `${it.x * 100}%`, top: "-30%", opacity: 0 }
                    : { left: `${it.x * 100}%`, top: `${it.y * 100}%`, opacity: 1 }
                }
                animate={{ left: `${it.x * 100}%`, top: `${it.y * 100}%`, opacity: 1 }}
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
                  initial={falling ? { rotate: it.rotate - 40, scale: 0.85 } : false}
                  animate={
                    still
                      ? { rotate: it.rotate, scale: 1 }
                      : falling
                        ? {
                            rotate: it.rotate,
                            scaleX: [0.85, 1.18, 0.94, 1.04, 1],
                            scaleY: [0.85, 0.8, 1.12, 0.96, 1],
                          }
                        : { rotate: it.rotate, scale: 1 }
                  }
                  transition={
                    still
                      ? { duration: 0 }
                      : falling
                        ? { duration: 0.62, times: [0, 0.55, 0.72, 0.88, 1], ease: "easeOut" }
                        : { type: "spring", stiffness: 210, damping: 18 }
                  }
                >
                  <Jelly shape={it.shape} color={it.color} size="100%" />
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

  if (!onShake) return jar;

  return (
    <button
      type="button"
      onClick={onShake}
      aria-label="병 흔들기"
      className="block cursor-pointer appearance-none"
    >
      {jar}
    </button>
  );
}
