import { motion } from "motion/react";
import { Jelly } from "./Jelly";
import type { PileItem } from "../lib/pile";

/**
 * 유리병. 크기는 CSS가 정하고 내부는 전부 % 로 배치해서
 * 어떤 화면 폭에서도 같은 더미가 나온다.
 *
 * 층 순서가 중요하다 — 젤리 더미(.jar-pile) 위에 반사층(.jar-glare)이
 * 덮여야 젤리가 유리 '앞'이 아니라 '안'에 있는 것처럼 보인다.
 */
export function Jar({
  items,
  className = "w-[min(272px,72vw)]",
  /** 젤리 지름, 병 너비 대비 */
  jellyRatio = 0.16,
  /** 이 키의 젤리는 위에서 떨어져 들어온다 */
  dropKey,
}: {
  items: PileItem[];
  className?: string;
  jellyRatio?: number;
  dropKey?: string;
}) {
  const size = `${jellyRatio * 100}%`;

  return (
    <div className={`jar ${className}`} style={{ aspectRatio: "200 / 275" }}>
      <div className="jar-cast" />
      <div className="jar-lid" />
      <div className="jar-neck" />
      <div className="jar-glass">
        <div className="jar-pile">
          {items.map((it) => {
            const place = {
              left: `${it.x * 100}%`,
              top: `${it.y * 100}%`,
              width: size,
            };
            const rest = `translate(-50%, -50%) rotate(${it.rotate}deg)`;

            if (it.key !== dropKey) {
              return (
                <span key={it.key} style={{ ...place, transform: rest }}>
                  <Jelly shape={it.shape} color={it.color} size="100%" />
                </span>
              );
            }

            // 떨어져서 바닥에 눌렸다가 다시 부푼다. 이 2초가 앱의 전부다.
            return (
              <motion.span
                key={it.key}
                style={place}
                initial={{
                  transform: `translate(-50%, -260%) rotate(${it.rotate - 40}deg) scale(0.82)`,
                  opacity: 0,
                }}
                animate={{
                  transform: [
                    `translate(-50%, -260%) rotate(${it.rotate - 40}deg) scale(0.82)`,
                    `translate(-50%, -50%) rotate(${it.rotate}deg) scale(1.16, 0.82)`,
                    `translate(-50%, -76%) rotate(${it.rotate}deg) scale(0.93, 1.1)`,
                    `translate(-50%, -50%) rotate(${it.rotate}deg) scale(1.05, 0.95)`,
                    `translate(-50%, -50%) rotate(${it.rotate}deg) scale(1)`,
                  ],
                  opacity: [0, 1, 1, 1, 1],
                }}
                transition={{ duration: 0.8, times: [0, 0.58, 0.74, 0.88, 1], ease: "easeOut" }}
              >
                <Jelly shape={it.shape} color={it.color} size="100%" />
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
    </div>
  );
}
