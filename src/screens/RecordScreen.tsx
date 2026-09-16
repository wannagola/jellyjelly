import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Heart } from "../components/Heart";
import { JellyFace } from "../components/JellyFace";
import { useGoBack } from "../lib/goBack";
import { db, startEating } from "../data/db";
import { searchJellies } from "../lib/search";
import { useCurrentMonth } from "../lib/useCurrentMonth";

/** 기록하기 — 찾아서 한 번 탭하면 끝. 없으면 바로 만들 수 있어야 한다. */
export function RecordScreen() {
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const thisMonth = useCurrentMonth();
  const [query, setQuery] = useState("");

  const jellies = useLiveQuery(() => db.jellies.orderBy("name").toArray(), []);
  const counts = useLiveQuery(async () => {
    const entries = await db.entries.toArray();
    const map = new Map<string, number>();
    for (const e of entries) {
      if (e.status === "done") map.set(e.jellyId, (map.get(e.jellyId) ?? 0) + 1);
    }
    return map;
  }, []);

  const results = useMemo(() => {
    const hits = searchJellies(jellies ?? [], query);
    // 검색어를 치면 관련도가 우선이고, 그냥 열었을 땐 최애가 위로 온다
    if (query.trim()) return hits;
    return [...hits].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
  }, [jellies, query]);

  async function pick(jellyId: string, name: string) {
    await startEating(jellyId);
    navigate(`/month/${thisMonth}`, {
      replace: true,
      state: { toast: `${name} 먹는 중으로 담았어요` },
    });
  }

  return (
    <>
      <header className="flex flex-none items-center justify-between gap-2 px-5 pt-3 pb-2.5">
        <h1 className="font-display text-2xl">뭐 먹었어요?</h1>
        <button type="button" onClick={goBack} className="text-base text-ink-soft">
          닫기
        </button>
      </header>

      <div className="flex-none px-5">
        <input
          // 기록 화면은 열자마자 검색으로 들어가는 게 맞다
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="젤리 이름"
          enterKeyHint="search"
          className="w-full rounded-2xl border-[1.5px] border-accent bg-surface px-3.5 py-2.5 text-md outline-none placeholder:text-ink-faint"
        />
        <p className="px-1 pt-1.5 pb-2 text-tiny text-ink-soft">
          초성으로도 찾을 수 있어요 · ㅁㄱㅁ → 마이구미
        </p>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <ul className="flex flex-col">
          {results.map((jelly) => {
            const n = counts?.get(jelly.id) ?? 0;
            return (
              <li key={jelly.id}>
                <button
                  type="button"
                  onClick={() => pick(jelly.id, jelly.name)}
                  className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition active:bg-accent-bg"
                >
                  <JellyFace jelly={jelly} size={42} radius={13} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      {jelly.favorite ? <Heart on size={11} /> : null}
                      <span className="truncate text-base font-medium">{jelly.name}</span>
                    </span>
                    <span className="block text-tiny text-ink-soft">{jelly.brand ?? "—"}</span>
                  </span>
                  <span className="flex-none text-tiny text-accent">
                    {n === 0 ? "첫 만남" : `${n + 1}번째`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() =>
            navigate(`/record/new${query.trim() ? `?name=${encodeURIComponent(query.trim())}` : ""}`)
          }
          className="mt-2 w-full rounded-2xl border-[1.5px] border-dashed border-ink-faint px-4 py-3 text-sm text-ink-soft transition active:scale-[.99]"
        >
          ＋ {query.trim() ? `"${query.trim()}" 새로 추가하기` : "새 젤리 직접 추가하기"}
        </button>
      </main>
    </>
  );
}
