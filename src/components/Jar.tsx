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
}: {
  items: PileItem[];
  className?: string;
  jellyRatio?: number;
}) {
  const size = `${jellyRatio * 100}%`;

  return (
    <div className={`jar ${className}`} style={{ aspectRatio: "200 / 275" }}>
      <div className="jar-cast" />
      <div className="jar-lid" />
      <div className="jar-neck" />
      <div className="jar-glass">
        <div className="jar-pile">
          {items.map((it) => (
            <span
              key={it.key}
              style={{
                left: `${it.x * 100}%`,
                top: `${it.y * 100}%`,
                width: size,
                transform: `translate(-50%, -50%) rotate(${it.rotate}deg)`,
              }}
            >
              <Jelly shape={it.shape} color={it.color} size="100%" />
            </span>
          ))}
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
