import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { AppBar } from "../components/AppBar";
import { EntrySheet } from "../components/EntrySheet";
import { Jar } from "../components/Jar";
import { JellyFace } from "../components/JellyFace";
import { Toast } from "../components/Toast";
import { db } from "../data/db";
import type { Jelly } from "../data/types";
import { JAR_CAPACITY, buildPile, jellyRatioFor } from "../lib/pile";
import { tiltMayWork, useTilt } from "../lib/tilt";
import { useSettings } from "../lib/settings";
import { playDrop, playShake } from "../lib/sound";
import { monthKeyOf, monthRange, parseMonthKey, seedFromKey, shiftMonth } from "../lib/month";
import { useCurrentMonth } from "../lib/useCurrentMonth";

/** 보관함 — 앱의 얼굴. 다 먹은 젤리가 그 달의 병에 쌓인다. */
export function ShelfScreen() {
  // 어느 달인지는 주소가 들고 있다(/month/2026-08).
  // 새로고침해도 유지되고, 탭바가 이걸 읽어서 지난 달에서는 기록 버튼을 잠근다.
  const { key } = useParams();
  const navigate = useNavigate();
  const cursor = useMemo(() => parseMonthKey(key ?? "") ?? new Date(), [key]);
  const month = useMemo(() => monthRange(cursor), [cursor]);
  const thisMonth = useCurrentMonth();
  const isThisMonth = month.key === thisMonth;

  function goMonth(delta: number) {
    navigate(`/month/${monthKeyOf(shiftMonth(cursor, delta).getTime())}`, { replace: true });
    setShakes(0);
  }
  const location = useLocation() as { state?: { toast?: string; drop?: boolean } };
  // 방금 담은 젤리만 떨어지는 연출을 받는다. 마운트 때 한 번만 잡아둔다.
  const [dropping] = useState(() => Boolean(location.state?.drop));
  const settings = useSettings();

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

  // 병에 들어갈 젤리들. id는 기록의 id라서, 같은 젤리를 두 번 먹었으면 두 알이 된다.
  const doneJellies = (data?.done ?? [])
    .map((e) => {
      const jelly = data?.byId.get(e.jellyId);
      return jelly ? { id: e.id, shape: jelly.shape, color: jelly.color, jellyId: jelly.id } : undefined;
    })
    .filter((x): x is { id: string; shape: Jelly["shape"]; color: Jelly["color"]; jellyId: string } =>
      Boolean(x),
    );

  // 흔들 때마다 씨앗이 바뀌어 젤리들이 새 자리로 옮겨간다
  const [shakes, setShakes] = useState(0);
  const pile = useMemo(
    () => buildPile(doneJellies, seedFromKey(month.key) + shakes * 977, shakes > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doneJellies.length, month.key, shakes],
  );

  // 젤리가 바닥에 닿는 순간에 맞춰 한 알 떨어지는 소리
  useEffect(() => {
    if (!dropping || settings?.muted) return;
    const timer = setTimeout(playDrop, 420);
    return () => clearTimeout(timer);
  }, [dropping, settings?.muted]);

  // 병에서 고른 젤리 한 알
  const [picked, setPicked] = useState<string>();

  const { tilt, live: tilting, enable: enableTilt } = useTilt(settings?.tilt ?? true);
  /**
   * 기울이기가 안 될 때 왜 안 되는지.
   *
   * 조용히 실패하면 쓰는 사람도 만든 사람도 손을 못 댄다. 막힌 자리를 셋으로
   * 갈라서 화면에 적는다 - 거절당했나, 허락은 받았는데 값이 안 오나, 셋 다 아닌가.
   */
  const [tiltNote, setTiltNote] = useState<"denied" | "silent" | undefined>();

  function shake() {
    setShakes((n) => n + 1);
    navigator.vibrate?.(12); // 안드로이드만. iOS 는 이 API 자체가 없어서 조용히 넘어간다
    if (!settings?.muted) playShake(count);
  }

  const count = doneJellies.length;
  const kinds = new Set(doneJellies.map((j) => j.jellyId)).size;
  const overflow = Math.max(0, count - JAR_CAPACITY);

  return (
    <>
      {/* 달 이름은 병 아래에 앞뒤 화살표와 함께 나오니 여기선 두 번 적지 않는다 */}
      <AppBar
        title="보관함"
        lead={<Link to="/">‹ 선반</Link>}
        side={<SettingsLink />}
      />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
        <section className="flex flex-col items-center pt-2">
          <Jar
            items={pile}
            jellyRatio={jellyRatioFor(pile.length)}
            tilt={tilt}
            dropKey={dropping ? pile.at(-1)?.key : undefined}
            shakeToken={shakes}
            onShake={count > 0 ? shake : undefined}
            onPick={setPicked}
          />

          <div className="mt-4 flex items-center gap-1">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => goMonth(-1)}
              className="grid size-8 place-items-center rounded-full text-ink-faint active:bg-line"
            >
              ‹
            </button>
            <p className="min-w-[7.5rem] text-center font-display text-lg">{month.label}</p>
            {/* 아직 오지 않은 달에는 먹은 젤리가 있을 수 없다 */}
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => goMonth(1)}
              disabled={isThisMonth}
              className="grid size-8 place-items-center rounded-full text-ink-faint active:bg-line disabled:opacity-25 disabled:active:bg-transparent"
            >
              ›
            </button>
          </div>

          <p className="mt-0.5 text-xs text-ink-soft">
            {count === 0
              ? "아직 비어 있어요"
              : overflow > 0
                ? `${kinds}종 · ${count}개 · 병에는 ${JAR_CAPACITY}개까지 보여요`
                : `${kinds}종 · ${count}개 담겼어요`}
          </p>
          <p className="mt-1 text-tiny text-ink-faint">
            {!isThisMonth
              ? "지난 병이에요 · 기록은 이번 달에만 담을 수 있어요"
              : count <= 1
                ? "아래 ＋ 로 젤리를 담아보세요"
                : tilting
                  ? "병을 톡 치면 섞이고, 폰을 기울이면 쏠려요"
                  : "병을 톡 치면 젤리가 섞여요"}
          </p>

          {/*
            기울이기 허락은 사용자가 누른 그 순간에만 물을 수 있다. 병 흔들기에
            얹어뒀더니 젤리가 커진 뒤로는 눌러도 젤리가 먼저 받아서 물음이
            아예 안 떴다. 눈에 보이는 버튼으로 따로 뺀다.
          */}
          {isThisMonth && count > 0 && !tilting && (settings?.tilt ?? true) && tiltMayWork() ? (
            <button
              type="button"
              onClick={async () => {
                setTiltNote(undefined);
                const ok = await enableTilt();
                if (!ok) {
                  setTiltNote("denied");
                  return;
                }
                // 허락은 떨어졌는데 값이 안 들어오는 경우가 있다. 잠깐 기다려 보고 말해준다.
                window.setTimeout(() => setTiltNote((n) => (n === undefined ? "silent" : n)), 1500);
              }}
              className="mt-2.5 rounded-full bg-accent-bg px-3.5 py-1.5 text-xs font-medium text-accent transition active:scale-95"
            >
              폰 기울이면 쏠리게 하기
            </button>
          ) : null}
          {tiltNote && !tilting ? (
            <p className="mt-2 max-w-[30ch] text-center text-tiny leading-relaxed text-ink-faint">
              {tiltNote === "denied"
                ? "허락을 못 받았어요. 아이폰 설정 → 앱 → Safari → 동작 및 방향 접근을 켜고 앱을 다시 열어보세요."
                : "허락은 됐는데 기울기 값이 안 들어와요. 아이폰 설정 → 앱 → Safari → 동작 및 방향 접근을 확인해 주세요."}
            </p>
          ) : null}
        </section>

        {data && data.eating.length > 0 ? (
          <section className="mt-7">
            <h2 className="mb-2 px-1 text-xs tracking-wide text-ink-soft">먹는 중</h2>
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
                        <span className="block truncate text-md font-medium">{jelly.name}</span>
                        <span className="block text-xs text-ink-soft">
                          {jelly.brand ?? "브랜드 없음"}
                        </span>
                      </span>
                      <span className="flex-none rounded-full bg-accent-bg px-3 py-1.5 text-sm font-medium text-accent">
                        다 먹었어요
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {isThisMonth && count === 0 && (!data || data.eating.length === 0) ? (
          <p className="mt-8 text-center text-base leading-relaxed text-ink-soft">
            아래 <span className="font-medium text-accent">＋</span> 를 눌러
            <br />
            지금 먹는 젤리를 기록해 보세요
          </p>
        ) : null}
      </main>

      <EntrySheet entryId={picked} onClose={() => setPicked(undefined)} />
      <Toast message={location.state?.toast} />
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
