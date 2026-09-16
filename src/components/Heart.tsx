/** 최애 표시. 채워진 하트와 빈 하트가 같은 자리를 차지해야 목록이 안 흔들린다. */
export function Heart({ on, size = 18 }: { on: boolean; size?: number }) {
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
      <path d="M12 20.4S3.2 14.9 3.2 9.2c0-2.9 2.3-5 4.9-5 1.9 0 3.2 1 3.9 2.2.7-1.2 2-2.2 3.9-2.2 2.6 0 4.9 2.1 4.9 5 0 5.7-8.8 11.2-8.8 11.2z" />
    </svg>
  );
}
