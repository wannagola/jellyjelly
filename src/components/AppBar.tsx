/**
 * 화면 제목 줄. 제목은 항상 가운데에 온다.
 * 양옆을 같은 너비로 잡아둬야 한쪽에만 아이콘이 있어도 제목이 안 밀린다.
 */
export function AppBar({
  title,
  side,
  lead,
}: {
  title: string;
  side?: React.ReactNode;
  lead?: React.ReactNode;
}) {
  return (
    <header className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 pt-3 pb-2.5">
      <span className="min-w-0 justify-self-start text-[12px] text-ink-soft">{lead}</span>
      <h1 className="truncate text-center font-display text-[19px]">{title}</h1>
      <span className="min-w-0 justify-self-end text-[12px] text-ink-soft">{side}</span>
    </header>
  );
}
