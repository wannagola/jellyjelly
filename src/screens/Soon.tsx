import { AppBar } from "../components/AppBar";
import { Jelly } from "../components/Jelly";
import type { JellyColor, JellyShape } from "../data/types";

/** 아직 안 만든 화면 — 언제 오는지까지 적어둔다 */
export function Soon({
  title,
  when,
  what,
  shape,
  color,
}: {
  title: string;
  when: string;
  what: string;
  shape: JellyShape;
  color: JellyColor;
}) {
  return (
    <>
      <AppBar title={title} />
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-10 text-center">
        <span className="opacity-35">
          <Jelly shape={shape} color={color} size={54} />
        </span>
        <p className="font-display text-[17px]">{when}</p>
        <p className="text-[13px] leading-relaxed text-ink-soft">{what}</p>
      </main>
    </>
  );
}
