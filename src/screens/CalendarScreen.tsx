import { format, getDate, getDay, getDaysInMonth, isSameDay, startOfMonth } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AppBar } from "../components/AppBar";
import { JellyFace } from "../components/JellyFace";
import { Stars } from "../components/Stars";
import { db } from "../data/db";
import type { Entry, Jelly } from "../data/types";
import { JELLY_COLORS } from "../lib/jelly";
import { monthRange, shiftMonth } from "../lib/month";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 날짜 칸의 점이 그날 먹은 젤리의 색. 빈 날도 허전하지 않게. */
export function CalendarScreen() {
  const [cursor, setCursor] = useState(() => new Date());
  const [picked, setPicked] = useState<number>();
  const month = useMemo(() => monthRange(cursor), [cursor]);

  const data = useLiveQuery(async () => {
    const entries = (
      await db.entries.where("finishedAt").between(month.start, month.end, true, true).toArray()
    )
      .filter((e) => e.status === "done")
      .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));

    const jellies = await db.jellies.toArray();
    const byId = new Map(jellies.map((j) => [j.id, j]));

    const byDay = new Map<number, { entry: Entry; jelly: Jelly }[]>();
    for (const entry of entries) {
      const jelly = byId.get(entry.jellyId);
      if (!jelly || !entry.finishedAt) continue;
      const day = getDate(entry.finishedAt);
      byDay.set(day, [...(byDay.get(day) ?? []), { entry, jelly }]);
    }
    return { byDay, total: entries.length };
  }, [month.start, month.end]);

  const first = startOfMonth(cursor);
  const blanks = getDay(first);
  const days = getDaysInMonth(cursor);
  const today = new Date();

  function changeMonth(delta: number) {
    setCursor((d) => shiftMonth(d, delta));
    setPicked(undefined);
  }

  const selected = picked ? (data?.byDay.get(picked) ?? []) : [];

  return (
    <>
      <AppBar
        title={format(cursor, "M월")}
        side={data ? `${data.total}개 먹었어요` : undefined}
      />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        <div className="mb-2 flex items-center justify-center gap-1">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => changeMonth(-1)}
            className="grid size-8 place-items-center rounded-full text-ink-faint active:bg-line"
          >
            ‹
          </button>
          <span className="min-w-[6.5rem] text-center text-[12px] text-ink-soft">
            {month.label}
          </span>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => changeMonth(1)}
            className="grid size-8 place-items-center rounded-full text-ink-faint active:bg-line"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 pb-1.5 text-center text-[10px] text-ink-faint">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1;
            const list = data?.byDay.get(day) ?? [];
            const isToday = isSameDay(new Date(cursor.getFullYear(), cursor.getMonth(), day), today);
            const on = picked === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setPicked(on ? undefined : day)}
                aria-pressed={on}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl transition ${
                  list.length ? "bg-surface" : ""
                } ${on ? "shadow-[inset_0_0_0_1.5px_var(--accent)]" : isToday ? "shadow-[inset_0_0_0_1.5px_var(--line)]" : ""}`}
              >
                <span
                  className={`text-[10px] tabular-nums ${list.length ? "text-ink" : "text-ink-faint"}`}
                >
                  {day}
                </span>
                {list.length ? (
                  <span className="flex gap-[2px]">
                    {list.slice(0, 3).map(({ entry, jelly }) => (
                      <i
                        key={entry.id}
                        className="block size-[5px] rounded-full"
                        style={{ background: JELLY_COLORS[jelly.color] }}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="block size-[5px]" />
                )}
              </button>
            );
          })}
        </div>

        <section className="mt-5">
          {picked === undefined ? (
            <p className="text-center text-[12px] text-ink-soft">
              날짜를 누르면 그날 먹은 젤리를 볼 수 있어요
            </p>
          ) : selected.length === 0 ? (
            <p className="text-center text-[12px] text-ink-soft">
              {format(cursor, "M월")} {picked}일에는 기록이 없어요
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selected.map(({ entry, jelly }) => (
                <li key={entry.id}>
                  <Link
                    to={`/jelly/${jelly.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-surface p-3 transition active:scale-[.99]"
                  >
                    <JellyFace jelly={jelly} size={38} radius={12} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{jelly.name}</span>
                      <span className="block truncate text-[10.5px] text-ink-soft">
                        {entry.review ?? jelly.brand ?? "—"}
                      </span>
                    </span>
                    {typeof entry.rating === "number" ? (
                      <Stars value={entry.rating} size={11} />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
