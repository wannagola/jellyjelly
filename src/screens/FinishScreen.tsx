import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { JellyFace } from "../components/JellyFace";
import { compressPhoto, usePhotoUrl } from "../lib/photo";
import { Stars } from "../components/Stars";
import { TextureSlider } from "../components/TextureSlider";
import { useGoBack } from "../lib/goBack";
import { db, finishEntry } from "../data/db";
import { JELLY_COLORS } from "../lib/jelly";
import { useCurrentMonth } from "../lib/useCurrentMonth";

/** 다 먹고 나서. 20초 안에 끝나야 다음에도 쓴다. */
export function FinishScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const thisMonth = useCurrentMonth();

  const data = useLiveQuery(async () => {
    if (!id) return undefined;
    const entry = await db.entries.get(id);
    if (!entry) return { entry: undefined, jelly: undefined };
    return { entry, jelly: await db.jellies.get(entry.jellyId) };
  }, [id]);

  const nth = useLiveQuery(async () => {
    if (!data?.entry) return 0;
    return db.entries
      .where("jellyId")
      .equals(data.entry.jellyId)
      .filter((e) => e.status === "done")
      .count();
  }, [data?.entry?.jellyId]);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [chewy, setChewy] = useState(50);
  const [sour, setSour] = useState(30);
  const [sweet, setSweet] = useState(60);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<Blob | undefined>();
  const [photoError, setPhotoError] = useState<string>();
  const photoUrl = usePhotoUrl(photo);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickPhoto(file?: File) {
    if (!file) return;
    setPhotoError(undefined);
    try {
      setPhoto(await compressPhoto(file));
    } catch {
      setPhotoError("사진을 불러오지 못했어요");
    }
  }

  if (data && !data.entry) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-10 text-center">
        <p className="font-display text-lg">기록을 찾지 못했어요</p>
        <button type="button" onClick={() => navigate("/")} className="text-base text-accent">
          보관함으로
        </button>
      </main>
    );
  }

  const jelly = data?.jelly;

  async function save() {
    if (!id || !jelly) return;
    setBusy(true);
    try {
      await finishEntry(id, {
        rating: rating || undefined,
        review: review.trim() || undefined,
        texture: { chewy, sour, sweet },
        photo,
      });
      navigator.vibrate?.(18);
      navigate(`/month/${thisMonth}`, {
        replace: true,
        state: { drop: true, toast: `${jelly.name} 병에 담았어요` },
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex flex-none items-center justify-between gap-2 px-5 pt-3 pb-1">
        <button type="button" onClick={goBack} className="text-base text-ink-soft">
          나중에
        </button>
        <h1 className="font-display text-lg">다 먹었어요</h1>
        <span className="w-[3.2rem]" />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
        {jelly ? (
          <>
            <div className="flex items-center gap-3 py-4">
              <JellyFace jelly={jelly} size={52} radius={17} />
              <div className="min-w-0">
                <p className="truncate font-display text-lg">{jelly.name}</p>
                <p className="text-xs text-ink-soft">
                  {jelly.brand ? `${jelly.brand} · ` : ""}
                  {(nth ?? 0) + 1}번째로 먹었어요
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
            {photoUrl ? (
              // 박스를 고정해두면 폰으로 찍은 세로 사진이 잘린다.
              // 사진이 제 비율대로 들어가고 너무 커지지만 않게 막는다.
              <div className="relative mx-auto mb-4 w-fit">
                <img
                  src={photoUrl}
                  alt="오늘 먹은 젤리"
                  className="max-h-[42vh] max-w-full rounded-2xl"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(undefined)}
                  className="absolute top-2 right-2 rounded-full bg-ink/60 px-2.5 py-1 text-tiny text-white"
                >
                  지우기
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mb-4 w-full rounded-2xl border-[1.5px] border-dashed border-ink-faint py-3 text-sm text-ink-soft transition active:scale-[.99]"
              >
                📷 오늘 먹은 사진 남기기
              </button>
            )}
            {photoError ? (
              <p className="mb-3 text-center text-xs text-accent">{photoError}</p>
            ) : null}

            <Stars value={rating} onChange={setRating} />

            <div className="mt-6">
              <TextureSlider
                label="쫀득함"
                value={chewy}
                onChange={setChewy}
                color={JELLY_COLORS.grape}
                words={["푸석", "무름", "보통", "쫀득", "아주 쫀득"]}
              />
              <TextureSlider
                label="신맛"
                value={sour}
                onChange={setSour}
                color={JELLY_COLORS.green}
                words={["안 셔요", "살짝", "적당", "새콤", "아주 셔요"]}
              />
              <TextureSlider
                label="단맛"
                value={sweet}
                onChange={setSweet}
                color={JELLY_COLORS.berry}
                words={["안 달아요", "은은", "적당", "달아요", "아주 달아요"]}
              />
            </div>

            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={2}
              placeholder="한 줄 남겨둘까요?"
              className="mt-2 w-full resize-none rounded-2xl bg-surface px-3.5 py-2.5 text-base outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
            />

            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="mt-4 w-full rounded-2xl bg-accent py-3.5 font-display text-lg text-white transition active:scale-[.98] disabled:opacity-50"
            >
              병에 담기 🫙
            </button>
            <p className="mt-2 text-center text-tiny text-ink-faint">
              {photo ? "사진은 이 기록에 남아요" : "별점과 한 줄은 안 써도 담겨요"}
            </p>
          </>
        ) : null}
      </main>
    </>
  );
}
