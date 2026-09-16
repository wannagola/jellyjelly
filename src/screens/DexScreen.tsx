import { getYear } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AppBar } from "../components/AppBar";
import { Heart } from "../components/Heart";
import { JellyFace } from "../components/JellyFace";
import { StatRow } from "../components/StatRow";
import { db } from "../data/db";
import { searchJellies } from "../lib/search";

type Tab = "fav" | "mine" | "all";

/** 도감 — 모은 젤리가 카드로 쌓인다. 이 화면이 제일 다시 보게 된다. */
export function DexScreen() {
  const [tab, setTab] = useState<Tab>("mine");
  const [query, setQuery] = useState("");

  const data = useLiveQuery(async () => {
    const [jellies, entries] = await Promise.all([
      db.jellies.orderBy("name").toArray(),
      db.entries.toArray(),
    ]);

    const counts = new Map<string, number>();
    const thisYear = new Set<string>();
    const year = getYear(new Date());

    for (const e of entries) {
      if (e.status !== "done") continue;
      counts.set(e.jellyId, (counts.get(e.jellyId) ?? 0) + 1);
      if (e.finishedAt && getYear(e.finishedAt) === year) thisYear.add(e.jellyId);
    }
    return { jellies, counts, thisYear };
  }, []);

  const shown = useMemo(() => {
    if (!data) return [];
    const pool = data.jellies.filter((j) => {
      if (tab === "fav") return Boolean(j.favorite);
      if (tab === "mine") return (data.counts.get(j.id) ?? 0) > 0;
      return true;
    });
    return searchJellies(pool, query);
  }, [data, tab, query]);

  const collected = data ? [...data.counts.keys()].length : 0;

  return (
    <>
      <AppBar title="내 젤리 도감" />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        <div className="mb-3">
          <StatRow
            items={[
              { value: collected, unit: "종", label: "모은 젤리" },
              { value: data?.thisYear.size ?? 0, unit: "종", label: "올해 새로" },
              { value: data?.jellies.length ?? 0, unit: "종", label: "도감 전체" },
            ]}
          />
        </div>

        <div className="mb-3 flex gap-1.5">
          <Segment on={tab === "fav"} onClick={() => setTab("fav")}>
            최애
          </Segment>
          <Segment on={tab === "mine"} onClick={() => setTab("mine")}>
            모은 젤리
          </Segment>
          <Segment on={tab === "all"} onClick={() => setTab("all")}>
            전체 목록
          </Segment>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름이나 초성으로 찾기"
          className="mb-3 w-full rounded-2xl bg-surface px-3.5 py-2.5 text-base outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
        />

        {shown.length === 0 ? (
          <p className="mt-10 whitespace-pre-line text-center text-base leading-relaxed text-ink-soft">
            {query.trim()
              ? "찾는 젤리가 없어요"
              : tab === "fav"
                ? "아직 최애가 없어요\n젤리를 열고 하트를 눌러보세요"
                : tab === "mine"
                  ? "아직 다 먹은 젤리가 없어요\n하나 기록하면 여기 쌓입니다"
                  : "도감이 비어 있어요"}
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {shown.map((jelly) => {
              const n = data?.counts.get(jelly.id) ?? 0;
              return (
                <li key={jelly.id}>
                  <Link
                    to={`/jelly/${jelly.id}`}
                    className={`relative flex flex-col items-center rounded-2xl bg-surface px-1.5 pt-2 pb-2.5 text-center transition active:scale-[.97] ${
                      n === 0 ? "opacity-55" : ""
                    }`}
                  >
                    {jelly.favorite ? (
                      <span className="absolute top-1.5 right-1.5">
                        <Heart on size={12} />
                      </span>
                    ) : null}
                    <JellyFace jelly={jelly} size={44} radius={14} />
                    <span className="mt-1.5 line-clamp-2 text-micro leading-tight">
                      {jelly.name}
                    </span>
                    <span className="mt-0.5 text-micro text-ink-faint tabular-nums">
                      {n === 0 ? "아직" : `×${n}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

function Segment({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex-1 rounded-full py-2 text-sm transition ${
        on ? "bg-accent-bg font-medium text-accent" : "bg-surface text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}
