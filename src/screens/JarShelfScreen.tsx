import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { Link } from "react-router";
import { AppBar } from "../components/AppBar";
import { FirstRunHint } from "../components/FirstRunHint";
import { Jar } from "../components/Jar";
import { StatRow } from "../components/StatRow";
import { db } from "../data/db";
import type { JellyColor, JellyShape } from "../data/types";
import { monthKeyOf, monthsFrom, seedFromKey } from "../lib/month";
import { useSettings } from "../lib/settings";
import { buildPile } from "../lib/pile";

const PER_ROW = 3;

interface Jarful {
  key: string;
  label: string;
  short: string;
  jellies: { id: string; shape: JellyShape; color: JellyColor }[];
  kinds: number;
}

/**
 * 젤리 선반 - 지난 병들을 한 화면에 세워둔다.
 * 달 하나씩 넘겨보면 "9월에 8개 먹었네"까지만 보이고
 * "올해 이만큼 모았네"가 안 보인다. 그 감동이 이 앱의 보상이다.
 */
export function JarShelfScreen() {
  const settings = useSettings();
  const data = useLiveQuery(async () => {
    const [entries, jellies] = await Promise.all([
      db.entries.where("status").equals("done").toArray(),
      db.jellies.toArray(),
    ]);
    const byId = new Map(jellies.map((j) => [j.id, j]));

    const buckets = new Map<string, Jarful["jellies"]>();
    const kinds = new Map<string, Set<string>>();
    let first = Number.POSITIVE_INFINITY;

    for (const entry of entries) {
      const jelly = byId.get(entry.jellyId);
      if (!jelly || !entry.finishedAt) continue;
      const key = monthKeyOf(entry.finishedAt);
      first = Math.min(first, entry.finishedAt);

      const list = buckets.get(key) ?? [];
      list.push({ id: entry.id, shape: jelly.shape, color: jelly.color });
      buckets.set(key, list);

      const set = kinds.get(key) ?? new Set<string>();
      set.add(jelly.id);
      kinds.set(key, set);
    }

    // 먼저 먹은 젤리가 아래에 깔리도록
    for (const list of buckets.values()) list.sort((a, b) => a.id.localeCompare(b.id));

    // 기록이 하나도 없으면 이번 달부터. 렌더 중에 Date.now() 를 부르지 않으려고 여기서 정한다.
    return { buckets, kinds, first: Number.isFinite(first) ? first : Date.now() };
  }, []);

  const jars = useMemo<Jarful[]>(() => {
    if (!data) return [];
    // 기록이 없어도 이번 달 빈 병은 선반에 서 있어야 한다. 텅 빈 홈은 앱처럼 안 보인다.
    return monthsFrom(data.first)
      .reverse()
      .map((month) => ({
        key: month.key,
        label: month.label,
        short: `${Number(month.key.slice(5))}월`,
        jellies: data.buckets.get(month.key) ?? [],
        kinds: data.kinds.get(month.key)?.size ?? 0,
      }));
  }, [data]);

  const rows = useMemo(
    () => Array.from({ length: Math.ceil(jars.length / PER_ROW) }, (_, i) => jars.slice(i * PER_ROW, i * PER_ROW + PER_ROW)),
    [jars],
  );

  const total = jars.reduce((sum, j) => sum + j.jellies.length, 0);
  const allKinds = data ? new Set([...data.kinds.values()].flatMap((s) => [...s])).size : 0;

  return (
    <>
      {/* 설명서가 톱니 안에 있다는 건 첫 화면에서만 알려줄 수 있다 */}
      <FirstRunHint />

      <AppBar
        title={settings?.nickname ? `${settings.nickname}의 젤리 선반` : "젤리 선반"}
        side={<SettingsLink />}
      />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        {jars.length === 0 ? null : (
          <>
            {total > 0 ? (
              <div className="mb-4">
                <StatRow
                  items={[
                    { value: total, unit: "개", label: "담은 젤리" },
                    { value: allKinds, unit: "종", label: "모은 종류" },
                    { value: jars.length, unit: "달", label: "모은 기간" },
                  ]}
                />
              </div>
            ) : (
              <p className="mb-4 rounded-2xl bg-surface px-4 py-3.5 text-center text-sm leading-relaxed text-ink-soft">
                아직 담은 젤리가 없어요
                <br />
                아래 <span className="font-medium text-accent">＋</span> 로 첫 젤리를 기록해 보세요
              </p>
            )}

            <div className="flex flex-col gap-1">
              {rows.map((row) => (
                <section key={row[0].key} className="mb-6">
                  {/* 병은 판자 위에 올라가고 라벨은 판자 아래 값표처럼 붙는다.
                      한 덩어리로 묶으면 병이 라벨 위에 떠 있는 것처럼 보인다. */}
                  <ul className="flex items-end gap-1">
                    {row.map((jar) => (
                      <li key={jar.key} className="min-w-0 flex-1">
                        <Link
                          to={`/month/${jar.key}`}
                          aria-label={`${jar.label} 보관함 열기`}
                          className="block transition active:scale-[.96]"
                        >
                          <Jar
                            quiet
                            className="w-full"
                            jellyRatio={0.21}
                            items={buildPile(jar.jellies, seedFromKey(jar.key))}
                          />
                        </Link>
                      </li>
                    ))}
                    {Array.from({ length: PER_ROW - row.length }, (_, i) => (
                      <li key={`gap-${i}`} className="flex-1" />
                    ))}
                  </ul>

                  <div className="h-2.5 rounded-[3px] bg-gradient-to-b from-[var(--plank-top)] to-[var(--plank-bottom)] shadow-[0_3px_7px_-3px_rgba(59,36,48,.45)]" />

                  <ul className="flex gap-1 pt-1.5">
                    {row.map((jar) => (
                      <li key={jar.key} className="min-w-0 flex-1 text-center">
                        <span className="block font-display text-sm">{jar.short}</span>
                        <span className="block text-micro text-ink-faint tabular-nums">
                          {jar.jellies.length > 0
                            ? `${jar.kinds}종 · ${jar.jellies.length}개`
                            : "비었어요"}
                        </span>
                      </li>
                    ))}
                    {Array.from({ length: PER_ROW - row.length }, (_, i) => (
                      <li key={`gap-${i}`} className="flex-1" />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}

        {/* 여기부터는 기록이 아니라 장난감이다. 선을 그어 갈라놔야 선반을 훑다가 헷갈리지 않는다. */}
        <div className="mt-7 mb-2.5 flex items-center gap-2.5">
          <span className="h-px flex-1 bg-line" />
          <span className="text-micro font-medium tracking-[.2em] text-ink-faint">
            PLAY GROUND
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="flex flex-col gap-2">
          <Link
            to="/tummy"
            className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 transition active:scale-[.99]"
          >
            <span className="text-2xl leading-none">🐘</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-base">코끼리 배</span>
              <span className="block text-xs text-ink-soft">
                두드리고, 코 당기고, 쓰다듬어요
              </span>
            </span>
            <span className="text-lg text-ink-faint">›</span>
          </Link>

          <Link
            to="/waxball"
            className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 transition active:scale-[.99]"
          >
            <span className="text-2xl leading-none">🥚</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-base">젤리 왁뿌볼</span>
              <span className="block text-xs text-ink-soft">
                왁스를 다 부수면 말랑이가 나와요
              </span>
            </span>
            <span className="text-lg text-ink-faint">›</span>
          </Link>
        </div>
      </main>
    </>
  );
}

function SettingsLink() {
  return (
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
  );
}
