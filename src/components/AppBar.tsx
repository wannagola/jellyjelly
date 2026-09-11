export function AppBar({ title, side }: { title: string; side?: React.ReactNode }) {
  return (
    <header className="flex flex-none items-end justify-between gap-2 px-5 pt-3 pb-2.5">
      <h1 className="font-display text-[22px] leading-tight">{title}</h1>
      {side ? <div className="pb-1 text-[12px] text-ink-soft">{side}</div> : null}
    </header>
  );
}
