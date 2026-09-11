import type { JellyColor, JellyShape } from "../data/types";
import { JELLY_COLORS } from "../lib/jelly";

const WHITE = "rgba(255,255,255,.55)";

/** 알맹이 여섯 모양. 모두 24×24 좌표계, 색은 currentColor. */
const PATHS: Record<JellyShape, React.ReactNode> = {
  bear: (
    <>
      <circle cx="6.6" cy="5.4" r="2.5" />
      <circle cx="17.4" cy="5.4" r="2.5" />
      <path d="M12 4.6c-3.5 0-5.9 2.6-5.9 6 0 1.7.5 2.7.5 4 0 1.3-.9 1.8-.9 3.3 0 1.9 1.7 3.1 3.4 3.1 1.2 0 1.9-.6 2.9-.6s1.7.6 2.9.6c1.7 0 3.4-1.2 3.4-3.1 0-1.5-.9-2-.9-3.3 0-1.3.5-2.3.5-4 0-3.4-2.4-6-5.9-6z" />
      <circle cx="9.6" cy="10.3" r="1.05" fill={WHITE} />
      <circle cx="14.4" cy="10.3" r="1.05" fill={WHITE} />
    </>
  ),
  worm: (
    <g fill="none" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round">
      <path d="M4.4 17.8c0-3 3.5-3 3.5-6s-3.5-3-3.5-6" />
      <path d="M11.4 17.8c0-3 3.5-3 3.5-6s-3.5-3-3.5-6" opacity=".82" />
      <path d="M18.4 17.8c0-3 1.4-3.6 1.4-5.8" opacity=".64" />
    </g>
  ),
  ring: (
    <circle cx="12" cy="12" r="7.4" fill="none" stroke="currentColor" strokeWidth="5.2" />
  ),
  cube: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.6" />
      <rect x="6.4" y="6.4" width="5.4" height="4.4" rx="2" fill="rgba(255,255,255,.4)" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20.6S2.8 14.9 2.8 8.9c0-3.1 2.4-5.3 5.1-5.3 2 0 3.3 1.1 4.1 2.3.8-1.2 2.1-2.3 4.1-2.3 2.7 0 5.1 2.2 5.1 5.3 0 6-9.2 11.7-9.2 11.7z" />
      <ellipse
        cx="8.5"
        cy="8.6"
        rx="1.5"
        ry="1.1"
        fill="rgba(255,255,255,.45)"
        transform="rotate(-28 8.5 8.6)"
      />
    </>
  ),
  bottle: (
    <>
      <path d="M9.4 2.2h5.2v2.1c0 .9.3 1.3.9 1.9.9.9 1.4 1.9 1.4 3.3v9.1c0 2-1.4 3.2-3.3 3.2h-3.2c-1.9 0-3.3-1.2-3.3-3.2V9.5c0-1.4.5-2.4 1.4-3.3.6-.6.9-1 .9-1.9V2.2z" />
      <rect x="8.3" y="10.2" width="7.4" height="2.5" fill="rgba(255,255,255,.42)" />
    </>
  ),
};

/** 봉지 — 찍은 사진이 아직 없을 때 '상품' 자리를 지키는 그림 */
export function Pouch({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ color }} aria-hidden>
      <path
        d="M4.3 3.6c1.3.5 2.2-.5 3.4 0s2.1-.5 3.3 0 2.2-.5 3.4 0 2.1-.5 3.3 0 2.1-.5 2.9-.1v16.9c-1.2-.5-2.1.5-3.3 0s-2.2.5-3.4 0-2.1.5-3.3 0-2.2.5-3.4 0-2-.4-2.9 0V3.6z"
        fill="currentColor"
      />
      <rect x="4.3" y="9.6" width="15.4" height="4.6" fill="rgba(255,255,255,.9)" />
      <rect x="6.2" y="11.1" width="7.2" height="1.5" rx=".75" fill="currentColor" opacity=".55" />
    </svg>
  );
}

export function Jelly({
  shape,
  color,
  size = 28,
}: {
  shape: JellyShape;
  color: JellyColor;
  /** 숫자는 px, 문자열은 그대로 — 병 안에서는 "100%"로 넣는다 */
  size?: number | string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      style={{ color: JELLY_COLORS[color], display: "block" }}
      aria-hidden
    >
      {PATHS[shape]}
    </svg>
  );
}
