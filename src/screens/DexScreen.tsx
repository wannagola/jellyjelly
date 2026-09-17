import { getYear } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AppBar } from "../components/AppBar";
import { Bookmark } from "../components/Bookmark";
import { Heart } from "../components/Heart";
import { type BrandStat, BrandProgress } from "../components/BrandProgress";
import { JellyFace } from "../components/JellyFace";
import { StatRow } from "../components/StatRow";
import { db } from "../data/db";
import { searchJellies } from "../lib/search";

type Tab = "fav" | "mine" | "all" | "brand";

/** 도감 — 모은 젤리가 카드로 쌓인다. 이 화면이 제일 다시 보게 된다. */
export function DexScreen() {
  const [tab, setTab] = useState<Tab>("mine");
  const [query, setQuery] = useState("");
  // 브랜드 막대를 누르면 그 브랜드만 남는다. "그래서 뭘 안 먹어봤는데?"로 이어져야 한다.
  const [brand, setBrand] = useState<string>();

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
      if (e.finishedAt && getYear(e.finishedAt) === year)
        thisYear.add(e.jellyId);
    }
    const brands = new Map<string, BrandStat>();
    for (const jelly of jellies) {
      if (!jelly.brand) continue;
      const row = brands.get(jelly.brand) ?? {
        brand: jelly.brand,
        total: 0,
        got: 0,
      };
      row.total += 1;
      if ((counts.get(jelly.id) ?? 0) > 0) row.got += 1;
      brands.set(jelly.brand, row);
    }

    // 손댄 브랜드를 위로. 다 모은 것보다 '한 개 남은 것'이 먼저 보여야 집게 된다.
    const ranked = [...brands.values()].sort(
      (a, b) =>
        Number(a.got >= a.total) - Number(b.got >= b.total) ||
        b.got - a.got ||
        b.total - a.total ||
        a.brand.localeCompare(b.brand),
    );

    return { jellies, counts, thisYear, brands: ranked };
  }, []);

  const shown = useMemo(() => {
    if (!data) return [];
    const pool = data.jellies.filter((j) => {
      if (brand && j.brand !== brand) return false;
      if (tab === "fav") return Boolean(j.favorite);
      if (tab === "mine") return (data.counts.get(j.id) ?? 0) > 0;
      return true;
    });
    return searchJellies(pool, query);
  }, [data, tab, query, brand]);

  const collected = data ? [...data.counts.keys()].length : 0;

  return (
    <>
      <AppBar title="내 젤리 도감" />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        <div className="mb-3">
          <StatRow
            items={[
              { value: collected, unit: "종", label: "모은 젤리" },
              {
                value: data?.thisYear.size ?? 0,
                unit: "종",
                label: "올해 새로",
              },
              {
                value: data?.jellies.length ?? 0,
                unit: "종",
                label: "도감 전체",
              },
            ]}
          />
        </div>

        <div className="mb-3 flex gap-1.5">
          <Segment on={tab === "fav"} onClick={() => setTab("fav")}>
            최애
          </Segment>
          <Segment on={tab === "mine"} onClick={() => setTab("mine")}>
            모은 것
          </Segment>
          <Segment on={tab === "all"} onClick={() => setTab("all")}>
            전체
          </Segment>
          <Segment
            on={tab === "brand"}
            onClick={() => {
              setTab("brand");
              setBrand(undefined);
            }}
          >
            브랜드
          </Segment>
        </div>

        {tab === "brand" ? (
          <>
            <p className="mb-2.5 px-1 text-xs text-ink-soft">
              브랜드 {data?.brands.length ?? 0}곳 중{" "}
              <b className="font-medium text-accent">
                {data?.brands.filter((b) => b.got >= b.total).length ?? 0}곳
              </b>{" "}
              완성
            </p>
            <ul className="flex flex-col gap-2">
              {(data?.brands ?? []).map((stat) => (
                <li key={stat.brand}>
                  <BrandProgress
                    stat={stat}
                    onPick={() => {
                      setBrand(stat.brand);
                      setTab("all");
                      setQuery("");
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {brand ? (
              <button
                type="button"
                onClick={() => {
                  setBrand(undefined);
                  setTab("brand");
                }}
                className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent-bg px-3 py-1.5 text-xs font-medium text-accent"
              >
                {brand}
                <span aria-hidden>✕</span>
              </button>
            ) : null}

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
                        {jelly.wish ? (
                          <span className="absolute top-1.5 left-1.5">
                            <Bookmark on size={12} />
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
          </>
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
