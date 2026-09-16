import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { Link } from "react-router";
import { AppBar } from "../components/AppBar";
import { JellyFace } from "../components/JellyFace";
import { db } from "../data/db";
import { COLOR_NAMES, JELLY_COLORS, SHAPE_NAMES } from "../lib/jelly";
import {
  type Suggestion,
  type TasteProfile,
  buildTaste,
  closeToTaste,
  coldStart,
  revisits,
  unexplored,
} from "../lib/taste";

/** 추천 - 재료는 오직 내 기록뿐이다. 이유를 못 대는 추천은 넣지 않는다. */
export function RecommendScreen() {
  const raw = useLiveQuery(
    async () => ({
      jellies: await db.jellies.toArray(),
      entries: await db.entries.toArray(),
    }),
    [],
  );

  const view = useMemo(() => {
    if (!raw) return undefined;
    const taste = buildTaste(raw.jellies, raw.entries);
    const again = revisits(raw.jellies, raw.entries);
    const close = closeToTaste(raw.jellies, raw.entries, taste);
    // 위 칸에 이미 뜬 젤리는 아래에서 빼준다
    const shown = new Set([...again, ...close].map((s) => s.jelly.id));
    return {
      taste,
      again,
      close,
      newLand: unexplored(raw.jellies, raw.entries, shown),
      cold: coldStart(raw.jellies, raw.entries),
    };
  }, [raw]);

  const warmedUp = (view?.taste.eaten ?? 0) >= 3;

  return (
    <>
      <AppBar title="뭐 먹을까" />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        {view ? (
          warmedUp ? (
            <>
              <TasteCard taste={view.taste} />
              <Section title="다시 만날 때" hint="좋아했는데 요즘 안 먹은 것" items={view.again} />
              <Section title="취향에 가까운" hint="아직 안 먹어본 젤리 중에서" items={view.close} />
              <Section title="안 가본 길" hint="취향이 굳지 않게" items={view.newLand} />
              {view.again.length + view.close.length + view.newLand.length === 0 ? (
                <p className="mt-10 text-center text-base leading-relaxed text-ink-soft">
                  도감을 거의 다 드셨네요.
                  <br />＋ 로 새 젤리를 추가해 보세요.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <section className="rounded-2xl bg-surface p-4">
                <p className="text-base font-medium">아직 추천할 만큼은 아니에요</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  이 앱은 남들이 아니라 <b className="font-medium text-ink">내 기록</b>으로
                  추천해요. 기록이 <b className="font-medium text-ink">3개</b>쯤 쌓이면
                  취향이 보이기 시작합니다.
                  <br />
                  지금 {view.taste.eaten}개 담으셨어요.
                </p>
              </section>
              <Section title="그동안은 이건 어때요" hint="도감에서 골라봤어요" items={view.cold} />
            </>
          )
        ) : null}
      </main>
    </>
  );
}

function TasteCard({ taste }: { taste: TasteProfile }) {
  const bars = taste.texture
    ? [
        { label: "쫀득함", value: taste.texture.chewy, color: JELLY_COLORS.grape },
        { label: "신맛", value: taste.texture.sour, color: JELLY_COLORS.green },
        { label: "단맛", value: taste.texture.sweet, color: JELLY_COLORS.berry },
      ]
    : [];

  const favBrand = taste.brands.find((b) => b.score > 0);
  const favColor = taste.colors.find((c) => c.score > 0);
  const favShape = taste.shapes.find((s) => s.score > 0);

  const chips = [
    favBrand ? favBrand.key : undefined,
    favColor ? `${COLOR_NAMES[favColor.key]} 맛` : undefined,
    favShape ? `${SHAPE_NAMES[favShape.key]} 모양` : undefined,
  ].filter(Boolean) as string[];

  return (
    <section className="rounded-2xl bg-surface p-4">
      <p className="text-xs text-ink-soft">기록 {taste.eaten}개로 본 내 취향</p>

      {bars.length > 0 ? (
        <div className="mt-2.5">
          {bars.map((bar) => (
            <div key={bar.label} className="mb-2 last:mb-0">
              <div className="mb-1 flex justify-between text-tiny text-ink-soft">
                <span>{bar.label}</span>
                <span className="tabular-nums">{Math.round(bar.value)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${bar.value}%`, background: bar.color }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-ink-soft">
          식감 슬라이더를 몇 번 더 움직이면 여기에 취향이 그려져요
        </p>
      )}

      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-accent-bg px-2.5 py-1 text-tiny font-medium text-accent"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Section({
  title,
  hint,
  items,
}: {
  title: string;
  hint: string;
  items: Suggestion[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-baseline gap-2 px-1">
        <span className="font-display text-md">{title}</span>
        <span className="text-tiny text-ink-faint">{hint}</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map(({ jelly, reason }) => (
          <li key={jelly.id}>
            <Link
              to={`/jelly/${jelly.id}`}
              className="flex items-center gap-3 rounded-2xl bg-surface p-3 transition active:scale-[.99]"
            >
              <JellyFace jelly={jelly} size={42} radius={13} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium">{jelly.name}</span>
                <span className="block truncate text-tiny text-ink-soft">
                  {reason || jelly.brand || "—"}
                </span>
              </span>
              <span className="flex-none text-lg text-ink-faint">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
