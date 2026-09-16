export interface BrandStat {
  brand: string;
  total: number;
  got: number;
}

/**
 * 브랜드 하나의 수집 막대.
 * 숫자만 보여주면 "그래서 뭘 안 먹어봤는데?"로 이어지지 않아서, 눌러서 넘어가게 한다.
 */
export function BrandProgress({ stat, onPick }: { stat: BrandStat; onPick: () => void }) {
  const done = stat.got >= stat.total;
  const ratio = stat.total === 0 ? 0 : stat.got / stat.total;

  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full rounded-2xl bg-surface px-4 py-3 text-left transition active:scale-[.99]"
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-base font-medium">{stat.brand}</span>
        {done ? (
          <span className="flex-none rounded-full bg-accent-bg px-2 py-0.5 text-micro font-medium text-accent">
            다 모았어요
          </span>
        ) : null}
        <span className="flex-none text-xs text-ink-soft tabular-nums">
          {stat.got} / {stat.total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </button>
  );
}
