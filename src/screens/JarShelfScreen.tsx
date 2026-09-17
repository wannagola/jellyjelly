import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
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
import { useToday } from "../lib/useCurrentMonth";
import { useSettings } from "../lib/settings";
import { buildPile, jellyRatioFor } from "../lib/pile";

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
  const today = useToday();
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
  // 첫 기록부터 오늘까지 며칠째인가. 첫날도 하루로 센다.
  const days = data
    ? differenceInCalendarDays(parseISO(today), startOfDay(data.first)) + 1
    : 0;
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
                    { value: days, unit: "일", label: "모은 기간" },
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
                            jellyRatio={jellyRatioFor(jar.jellies.length)}
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

        {/*
          장난감 여덟 줄이 선반 아래 늘어서 있었다. 기록하러 들어온 사람이
          그걸 다 지나쳐야 했다. 입구만 하나 두고 안에서 갈라 놓는다.
        */}
        <div className="mt-7 flex flex-col gap-2">
          <Link
            to="/play"
            className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 transition active:scale-[.99]"
          >
            <span className="text-2xl leading-none">🎮</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-base">PLAY GROUND</span>
              <span className="block text-xs text-ink-soft">
                만지작거리는 것 둘, 머리 쓰는 것 일곱
              </span>
            </span>
            <span className="text-lg text-ink-faint">›</span>
          </Link>

          <BackupNudge />
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

/**
 * 백업한 지 오래됐다고 알려주는 줄.
 *
 * 서버가 없어서 이 세상에 기록은 폰 안의 사본 하나뿐인데, 지금까지는 사용자가
 * 알아서 챙겨야 했다. 담은 게 있는데 한 달 넘게 안 챙겼으면 여기서 말해준다.
 * 아직 하나도 안 담은 사람에게는 잃을 게 없으니 띄우지 않는다.
 */
function BackupNudge() {
  // 렌더 중에 Date.now() 를 부르면 값이 언제 바뀔지 알 수 없다. 오늘 날짜를
  // 따로 받아 쓴다 - 며칠씩 열어둔 앱에서도 자정이 지나면 하루가 올라간다.
  const today = useToday();
  const state = useLiveQuery(async () => {
    const entries = await db.entries.count();
    const last = (await db.meta.get("lastBackupAt"))?.value as number | undefined;
    return { entries, last };
  }, []);

  if (!state || state.entries === 0) return null;
  const days = state.last
    ? differenceInCalendarDays(parseISO(today), startOfDay(state.last))
    : undefined;
  if (days !== undefined && days < 30) return null;

  return (
    <Link
      to="/settings"
      className="flex items-center gap-3 rounded-2xl bg-accent-bg px-4 py-3 transition active:scale-[.99]"
    >
      <span className="text-xl leading-none">🫙</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-accent">
          {days === undefined ? "아직 백업한 적이 없어요" : `백업한 지 ${days}일 됐어요`}
        </span>
        <span className="block text-xs leading-snug text-ink-soft">
          기록은 이 폰에만 있어요. 설정에서 파일 하나로 받아두세요.
        </span>
      </span>
      <span className="text-lg text-ink-faint">›</span>
    </Link>
  );
}
