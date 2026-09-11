import { useMemo, useState } from "react";
import { AppBar } from "../components/AppBar";
import { Jar } from "../components/Jar";
import { JAR_CAPACITY, layoutPile } from "../lib/pile";

/**
 * 보관함 — 앱의 얼굴.
 * Day 1은 예시 더미로 병을 그린다. Day 2에 Dexie의 실제 기록으로 갈아끼운다.
 */
export function ShelfScreen() {
  const [count, setCount] = useState(21);
  const items = useMemo(() => layoutPile(count, 7), [count]);
  const full = count >= JAR_CAPACITY;

  return (
    <>
      <AppBar title="젤리젤리" side="9월 ▾" />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 pb-6">
        <Jar items={items} />

        <div className="mt-3.5 text-center">
          <p className="font-display text-[16px]">9월의 젤리병</p>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            {full ? "병이 꽉 찼어요 · 10월 병으로 넘어갑니다" : `${count}개 담겼어요`}
          </p>
        </div>

        <button
          type="button"
          disabled={full}
          onClick={() => setCount((c) => Math.min(c + 1, JAR_CAPACITY))}
          className="mt-5 rounded-full bg-accent-bg px-4 py-2 text-[12px] font-medium text-accent transition active:scale-95 disabled:opacity-40"
        >
          젤리 하나 넣어보기 🍬
        </button>
        <p className="mt-2 text-[10px] text-ink-faint">예시 더미 · 내일 진짜 기록으로 바뀝니다</p>
      </main>
    </>
  );
}
