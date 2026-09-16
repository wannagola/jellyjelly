import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { AppBar } from "../components/AppBar";
import { Jar } from "../components/Jar";
import { JellyFace } from "../components/JellyFace";
import { Toast } from "../components/Toast";
import { db } from "../data/db";
import type { Jelly } from "../data/types";
import { JAR_CAPACITY, buildPile } from "../lib/pile";
import { monthRange, seedFromKey, shiftMonth } from "../lib/month";

/** 보관함 — 앱의 얼굴. 다 먹은 젤리가 그 달의 병에 쌓인다. */
export function ShelfScreen() {
  const [cursor, setCursor] = useState(() => new Date());
  const month = useMemo(() => monthRange(cursor), [cursor]);
  const location = useLocation() as { state?: { toast?: string; drop?: boolean } };
  // 방금 담은 젤리만 떨어지는 연출을 받는다. 마운트 때 한 번만 잡아둔다.
  const [playDrop] = useState(() => Boolean(location.state?.drop));

  const data = useLiveQuery(async () => {
    const [done, eating, jellies] = await Promise.all([
      db.entries
        .where("finishedAt")
        .between(month.start, month.end, true, true)
        .toArray(),
      db.entries.where("status").equals("eating").toArray(),
      db.jellies.toArray(),
    ]);
    const byId = new Map(jellies.map((j) => [j.id, j]));
    return {
      done: done
        .filter((e) => e.status === "done")
        .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0)),
      eating: eating.sort((a, b) => b.startedAt - a.startedAt),
      byId,
    };
  }, [month.start, month.end]);

  const doneJellies = (data?.done ?? [])
    .map((e) => data?.byId.get(e.jellyId))
    .filter((j): j is Jelly => Boolean(j));

  const pile = useMemo(
    () => buildPile(doneJellies, seedFromKey(month.key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doneJellies.length, month.key],
  );

  const count = doneJellies.length;
  const kinds = new Set(doneJellies.map((j) => j.id)).size;
  const overflow = Math.max(0, count - JAR_CAPACITY);

  return (
    <>
      <AppBar
        title="젤리젤리"
        side={
          <span className="flex items-center gap-3">
            {count > 0 ? <span className="tabular-nums">{`${kinds}종 · ${count}개`}</span> : null}
            <Link to="/settings" aria-label="설정" className="text-ink-faint">
              <svg
                viewBox="0 0 24 24"
                className="size-[19px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path
                  d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9M18.6 18.6l-1.9-1.9M7.3 7.3 5.4 5.4"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          </span>
        }
      />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
        <section className="flex flex-col items-center pt-2">
          <Jar items={pile} dropKey={playDrop ? pile.at(-1)?.key : undefined} />

          <div className="mt-4 flex items-center gap-1">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => setCursor((d) => shiftMonth(d, -1))}
              className="grid size-8 place-items-center rounded-full text-ink-faint active:bg-line"
            >
              ‹
            </button>
            <p className="min-w-[7.5rem] text-center font-display text-[16px]">{month.label}</p>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => setCursor((d) => shiftMonth(d, 1))}
              className="grid size-8 place-items-center rounded-full text-ink-faint active:bg-line"
            >
              ›
            </button>
          </div>

          <p className="mt-0.5 text-[11px] text-ink-soft">
            {count === 0
              ? "아직 비어 있어요"
              : overflow > 0
                ? `${count}개 담겼어요 · 병에는 ${JAR_CAPACITY}개까지 보여요`
                : `${count}개 담겼어요`}
          </p>
        </section>

        {data && data.eating.length > 0 ? (
          <section className="mt-7">
            <h2 className="mb-2 px-1 text-[11px] tracking-wide text-ink-soft">먹는 중</h2>
            <ul className="flex flex-col gap-2">
              {data.eating.map((entry) => {
                const jelly = data.byId.get(entry.jellyId);
                if (!jelly) return null;
                return (
                  <li key={entry.id}>
                    <Link
                      to={`/finish/${entry.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-surface p-3 transition active:scale-[.99]"
                    >
                      <JellyFace jelly={jelly} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{jelly.name}</span>
                        <span className="block text-[11px] text-ink-soft">
                          {jelly.brand ?? "브랜드 없음"}
                        </span>
                      </span>
                      <span className="flex-none rounded-full bg-accent-bg px-3 py-1.5 text-[12px] font-medium text-accent">
                        다 먹었어요
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {count === 0 && (!data || data.eating.length === 0) ? (
          <p className="mt-8 text-center text-[13px] leading-relaxed text-ink-soft">
            아래 <span className="font-medium text-accent">＋</span> 를 눌러
            <br />
            지금 먹는 젤리를 기록해 보세요
          </p>
        ) : null}
      </main>

      <Toast message={location.state?.toast} />
    </>
  );
}
