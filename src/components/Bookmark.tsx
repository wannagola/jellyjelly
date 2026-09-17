/** 찜 표시. 하트(최애)와 헷갈리지 않게 모양을 확실히 다르게 둔다. */
export function Bookmark({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={on ? "var(--accent)" : "none"}
      stroke={on ? "var(--accent)" : "currentColor"}
      strokeWidth="1.9"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6.2 3.8h11.6c.6 0 1 .5 1 1v15.4l-6.8-4.3-6.8 4.3V4.8c0-.5.4-1 1-1z" />
    </svg>
  );
}
