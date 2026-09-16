import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Jelly as JellyIcon } from "../components/Jelly";
import { JellyFace } from "../components/JellyFace";
import { addJelly, db, startEating, updateJelly } from "../data/db";
import type { Jelly, JellyColor, JellyShape } from "../data/types";
import { COLOR_KEYS, COLOR_NAMES, JELLY_COLORS, SHAPE_KEYS, SHAPE_NAMES } from "../lib/jelly";
import { compressPhoto } from "../lib/photo";

/**
 * 젤리 추가 / 수정.
 * 수정일 때는 기존 젤리를 먼저 읽고 나서 폼을 띄운다 — 그래야 폼이
 * 처음 그려질 때부터 제 값을 들고 있고, 나중에 밀어넣을 일이 없다.
 */
export function JellyFormScreen({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const [params] = useSearchParams();

  const existing = useLiveQuery(
    () => (mode === "edit" && id ? db.jellies.get(id) : undefined),
    [mode, id],
  );

  if (mode === "edit") {
    if (existing === undefined) return null;
    return <JellyForm key={existing.id} mode="edit" initial={existing} />;
  }

  return <JellyForm mode="create" initial={{ name: params.get("name") ?? "" }} />;
}

type Draft = {
  id?: string;
  name: string;
  brand?: string;
  shape?: JellyShape;
  color?: JellyColor;
  photo?: Blob;
};

/**
 * 이름 말고는 전부 나중에 채워도 된다 - 등록이 10초를 넘으면 앱을 안 쓰게 된다.
 */
function JellyForm({ mode, initial }: { mode: "create" | "edit"; initial: Draft | Jelly }) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial.name);
  const [brand, setBrand] = useState(initial.brand ?? "");
  const [shape, setShape] = useState<JellyShape>(initial.shape ?? "bear");
  const [color, setColor] = useState<JellyColor>(initial.color ?? "grape");
  const [photo, setPhoto] = useState<Blob | undefined>(initial.photo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const id = initial.id;

  async function onPickPhoto(file?: File) {
    if (!file) return;
    setError(undefined);
    try {
      setPhoto(await compressPhoto(file));
    } catch {
      setError("사진을 불러오지 못했어요. 다른 사진으로 해볼까요?");
    }
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("젤리 이름은 있어야 해요");
      return;
    }
    setBusy(true);
    try {
      const fields = { name: trimmed, brand: brand.trim() || undefined, shape, color, photo };
      if (mode === "edit" && id) {
        await updateJelly(id, fields);
        navigate(-1);
        return;
      }
      const jellyId = await addJelly(fields);
      await startEating(jellyId);
      navigate("/", { replace: true, state: { toast: `${trimmed} 먹는 중으로 담았어요` } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex flex-none items-center justify-between gap-2 px-5 pt-3 pb-2.5">
        <button type="button" onClick={() => navigate(-1)} className="text-[13px] text-ink-soft">
          ‹ 뒤로
        </button>
        <h1 className="font-display text-[17px]">
          {mode === "edit" ? "젤리 고치기" : "새 젤리"}
        </h1>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="text-[13px] font-medium text-accent disabled:opacity-40"
        >
          {mode === "edit" ? "저장" : "담기"}
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
        <div className="flex flex-col items-center pt-2 pb-5">
          <JellyFace jelly={{ name, shape, color, photo }} size={104} radius={30} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickPhoto(e.target.files?.[0])}
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-accent-bg px-3.5 py-1.5 text-[12px] font-medium text-accent"
            >
              {photo ? "사진 바꾸기" : "봉지 사진 넣기"}
            </button>
            {photo ? (
              <button
                type="button"
                onClick={() => setPhoto(undefined)}
                className="rounded-full px-3 py-1.5 text-[12px] text-ink-soft"
              >
                지우기
              </button>
            ) : null}
          </div>
          {!photo ? (
            <p className="mt-2 text-[10.5px] text-ink-faint">사진은 나중에 채워도 돼요</p>
          ) : null}
        </div>

        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="마이구미 포도"
            className="w-full rounded-2xl bg-surface px-3.5 py-2.5 text-[14px] outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
          />
        </Field>

        <Field label="브랜드" hint="몰라도 괜찮아요">
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="오리온"
            className="w-full rounded-2xl bg-surface px-3.5 py-2.5 text-[14px] outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
          />
        </Field>

        <Field label="모양" hint="사진이 없을 때의 얼굴">
          <div className="grid grid-cols-6 gap-1.5">
            {SHAPE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={shape === key}
                aria-label={SHAPE_NAMES[key]}
                onClick={() => setShape(key)}
                className={`grid aspect-square place-items-center rounded-xl transition ${
                  shape === key ? "bg-accent-bg shadow-[inset_0_0_0_1.5px_var(--accent)]" : "bg-surface"
                }`}
              >
                <JellyIcon shape={key} color={color} size={26} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="색">
          <div className="grid grid-cols-8 gap-1.5">
            {COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={color === key}
                aria-label={COLOR_NAMES[key]}
                onClick={() => setColor(key)}
                className={`aspect-square rounded-full transition ${
                  color === key ? "ring-2 ring-ink/25 ring-offset-2 ring-offset-bg" : ""
                }`}
                style={{ background: JELLY_COLORS[key] }}
              />
            ))}
          </div>
        </Field>

        {error ? <p className="mt-4 text-[12.5px] text-accent">{error}</p> : null}
      </main>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline gap-2 px-1">
        <span className="text-[11px] font-medium text-ink-soft">{label}</span>
        {hint ? <span className="text-[10px] text-ink-faint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
