/** 숫자 몇 개를 나란히. 단위는 작게 붙여야 숫자가 먼저 읽힌다. */
export function StatRow({
  items,
}: {
  items: { value: number | string; unit?: string; label: string }[];
}) {
  return (
    <div className="grid rounded-2xl bg-surface py-3.5" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`px-1 text-center ${i > 0 ? "border-l border-line" : ""}`}
        >
          <p className="font-display text-2xl leading-none text-accent">
            <span className="tabular-nums">{item.value}</span>
            {item.unit ? <span className="ml-0.5 text-base">{item.unit}</span> : null}
          </p>
          <p className="mt-1.5 text-tiny text-ink-soft">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
