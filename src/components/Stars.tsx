const STAR_PATH =
  "M12 2.8l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.7l-5.8 3.05 1.1-6.5L2.6 9.65l6.5-.95L12 2.8z";

export function Stars({
  value,
  onChange,
  size = 26,
}: {
  value: number;
  onChange?: (next: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];

  if (!onChange) {
    return (
      <div className="flex gap-0.5" aria-label={`별점 ${value}점`}>
        {stars.map((n) => (
          <Star key={n} filled={n <= value} size={size} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-1.5" role="radiogroup" aria-label="별점">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}점`}
          onClick={() => onChange(n)}
          className="p-0.5 transition active:scale-90"
        >
          <Star filled={n <= value} size={size} />
        </button>
      ))}
    </div>
  );
}

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d={STAR_PATH} fill={filled ? "var(--star)" : "var(--line)"} />
    </svg>
  );
}
