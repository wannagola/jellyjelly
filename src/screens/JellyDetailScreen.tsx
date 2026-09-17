import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { Link, useNavigate, useParams } from "react-router";
import { Bookmark } from "../components/Bookmark";
import { Heart } from "../components/Heart";
import { JellyFace } from "../components/JellyFace";
import { Stars } from "../components/Stars";
import { usePhotoUrl } from "../lib/photo";
import { useGoBack } from "../lib/goBack";
import { db, toggleFavorite, toggleWish } from "../data/db";
import type { Entry } from "../data/types";
import { COLOR_NAMES, JELLY_COLORS, SHAPE_NAMES } from "../lib/jelly";

/** 같은 젤리를 먹을 때마다 기록이 아래로 쌓인다. */
export function JellyDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack("/dex");

  const data = useLiveQuery(async () => {
    if (!id) return undefined;
    const jelly = await db.jellies.get(id);
    const entries = (await db.entries.where("jellyId").equals(id).toArray())
      .filter((e) => e.status === "done")
      .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
    return { jelly, entries };
  }, [id]);

  if (data && !data.jelly) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-10 text-center">
        <p className="font-display text-lg">없는 젤리예요</p>
        <button type="button" onClick={() => navigate("/dex")} className="text-base text-accent">
          도감으로
        </button>
      </main>
    );
  }

  const jelly = data?.jelly;
  const entries = data?.entries ?? [];
  const rated = entries.filter((e) => typeof e.rating === "number");
  const avg = rated.length
    ? rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length
    : undefined;

  return (
    <>
      <header className="flex flex-none items-center justify-between gap-2 px-5 pt-3 pb-1">
        <button type="button" onClick={goBack} className="text-base text-ink-soft">
          ‹ 뒤로
        </button>
        {jelly ? (
          <span className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => toggleWish(jelly.id)}
              aria-pressed={Boolean(jelly.wish)}
              aria-label={jelly.wish ? "찜 풀기" : "먹어보고 싶어요"}
              className="text-ink-faint transition active:scale-90"
            >
              <Bookmark on={Boolean(jelly.wish)} size={20} />
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(jelly.id)}
              aria-pressed={Boolean(jelly.favorite)}
              aria-label={jelly.favorite ? "최애에서 빼기" : "최애로 담기"}
              className="text-ink-faint transition active:scale-90"
            >
              <Heart on={Boolean(jelly.favorite)} size={21} />
            </button>
            <Link to={`/jelly/${jelly.id}/edit`} className="text-base text-accent">
              고치기
            </Link>
          </span>
        ) : null}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
        {jelly ? (
          <>
            <div className="flex flex-col items-center rounded-b-[26px] bg-surface px-5 pt-1 pb-5 text-center">
              <JellyFace jelly={jelly} size={112} radius={34} />
              <h1 className="mt-3 flex items-center justify-center gap-1.5 font-display text-xl">
                {jelly.favorite ? <Heart on size={15} /> : null}
                {jelly.name}
              </h1>
              <p className="mt-0.5 text-xs text-ink-soft">
                {[jelly.brand, `${COLOR_NAMES[jelly.color]} ${SHAPE_NAMES[jelly.shape]}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {avg !== undefined ? (
                <div className="mt-2.5">
                  <Stars value={Math.round(avg)} size={16} />
                </div>
              ) : null}
            </div>

            <div className="px-5">
              <div className="mt-3.5 flex gap-1.5">
                <Stat value={String(entries.length)} label="먹은 횟수" />
                <Stat value={avg ? avg.toFixed(1) : "—"} label="내 평균 별점" />
                <Stat value={jelly.kcal ? String(jelly.kcal) : "—"} label="kcal / 봉" />
              </div>

              <TextureSummary entries={entries} />

              <h2 className="mt-6 mb-2 px-1 text-xs tracking-wide text-ink-soft">내 기록</h2>
              {entries.length === 0 ? (
                <p className="px-1 text-sm text-ink-soft">
                  아직 다 먹은 기록이 없어요
                </p>
              ) : (
                <ol className="ml-1.5 flex flex-col gap-3 border-l-2 border-line pl-3.5">
                  {entries.map((e) => (
                    <TimelineRow key={e.id} entry={e} />
                  ))}
                </ol>
              )}
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-surface px-1 py-2.5 text-center">
      <b className="block font-display text-xl text-accent tabular-nums">{value}</b>
      <span className="text-micro text-ink-soft">{label}</span>
    </div>
  );
}

/** 여러 번 먹었으면 식감도 평균이 생긴다 */
function TextureSummary({ entries }: { entries: Entry[] }) {
  const withTexture = entries.filter((e) => e.texture);
  if (withTexture.length === 0) return null;

  const mean = (pick: (e: Entry) => number) =>
    withTexture.reduce((sum, e) => sum + pick(e), 0) / withTexture.length;

  const bars = [
    { label: "쫀득함", value: mean((e) => e.texture?.chewy ?? 0), color: JELLY_COLORS.grape },
    { label: "신맛", value: mean((e) => e.texture?.sour ?? 0), color: JELLY_COLORS.green },
    { label: "단맛", value: mean((e) => e.texture?.sweet ?? 0), color: JELLY_COLORS.berry },
  ];

  return (
    <div className="mt-3.5 rounded-2xl bg-surface p-4">
      <p className="mb-2.5 text-tiny text-ink-soft">내가 기억하는 맛</p>
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
  );
}

/** 기록 한 줄. 그날 찍은 사진이 있으면 옆에 붙는다. */
function TimelineRow({ entry }: { entry: Entry }) {
  const photo = usePhotoUrl(entry.photo);

  return (
    <li className="relative flex gap-2.5">
      <span className="absolute -left-[1.32rem] top-1.5 size-2 rounded-full border-2 border-bg bg-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-tiny text-ink-faint">
          {entry.finishedAt ? format(entry.finishedAt, "yyyy.MM.dd") : ""}
          {typeof entry.rating === "number" ? ` · ★${entry.rating}` : ""}
        </p>
        {entry.review ? <p className="text-sm">{entry.review}</p> : null}
      </div>
      {photo ? (
        <img
          src={photo}
          alt=""
          className="size-14 flex-none rounded-xl object-cover shadow-[inset_0_0_0_1px_var(--line)]"
        />
      ) : null}
    </li>
  );
}
