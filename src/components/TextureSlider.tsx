/** 식감 슬라이더. 글로 쓰기 귀찮은 걸 손가락 한 번으로 남긴다. */
export function TextureSlider({
  label,
  value,
  onChange,
  color,
  words,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  color: string;
  /** 0~100 을 말로 옮긴 다섯 단계 */
  words: [string, string, string, string, string];
}) {
  const word = words[Math.min(4, Math.floor(value / 20))];

  return (
    <label className="mb-3 block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs text-ink-soft">
        {label}
        <b className="font-medium text-ink">{word}</b>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="texture-range w-full"
        style={{ "--fill": `${value}%`, "--tint": color } as React.CSSProperties}
      />
    </label>
  );
}
