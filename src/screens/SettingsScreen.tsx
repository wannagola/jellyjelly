import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { AccountSection } from "../components/AccountSection";
import { AppBar } from "../components/AppBar";
import { db, syncSeed } from "../data/db";
import { syncEnabled } from "../lib/supabase";
import { setMuted, setNickname, setTheme, useSettings } from "../lib/settings";
import { useIsStandalone } from "../lib/standalone";
import { THEMES, applyTheme } from "../lib/theme";
import { playShake } from "../lib/sound";
import { buildBackup, downloadBackup, restoreBackup, wipeEverything } from "../lib/backup";

/** 설정 — 여기서 가장 중요한 건 백업이다. 서버가 없으면 사본이 하나뿐이다. */
export function SettingsScreen() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | "wipe">();
  const [note, setNote] = useState<string>();
  const [error, setError] = useState<string>();
  const [confirmWipe, setConfirmWipe] = useState(false);

  const settings = useSettings();
  const standalone = useIsStandalone();

  const stats = useLiveQuery(async () => {
    const [jellies, entries] = await Promise.all([db.jellies.count(), db.entries.count()]);
    const lastBackup = await db.meta.get("lastBackupAt");
    return { jellies, entries, lastBackup: lastBackup?.value as number | undefined };
  }, []);

  function reset() {
    setNote(undefined);
    setError(undefined);
  }

  async function onExport() {
    reset();
    setBusy("export");
    try {
      const backup = await buildBackup();
      downloadBackup(backup);
      await db.meta.put({ key: "lastBackupAt", value: backup.exportedAt });
      setNote(`젤리 ${backup.jellies.length}종 · 기록 ${backup.entries.length}건을 내려받았어요`);
    } catch {
      setError("백업 파일을 만들지 못했어요");
    } finally {
      setBusy(undefined);
    }
  }

  async function onImport(file?: File) {
    if (!file) return;
    reset();
    setBusy("import");
    try {
      const result = await restoreBackup(file);
      setNote(`젤리 ${result.jellies}종 · 기록 ${result.entries}건을 되살렸어요`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "복원하지 못했어요");
    } finally {
      setBusy(undefined);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onWipe() {
    reset();
    setBusy("wipe");
    try {
      await wipeEverything();
      await syncSeed();
      setConfirmWipe(false);
      setNote("모두 지웠어요");
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <>
      <AppBar title="설정" />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        {syncEnabled ? (
          <>
            <h2 className="mb-2 px-1 text-xs tracking-wide text-ink-soft">계정</h2>
            <AccountSection />
          </>
        ) : null}

        <h2 className={`${syncEnabled ? "mt-6 " : ""}mb-2 px-1 text-xs tracking-wide text-ink-soft`}>
          내 이름
        </h2>
        {settings ? <NicknameRow key={settings.nickname} initial={settings.nickname ?? ""} /> : null}

        <h2 className="mt-6 mb-2 px-1 text-xs tracking-wide text-ink-soft">색</h2>
        <div className="rounded-2xl bg-surface p-4">
          <div className="flex justify-between gap-2">
            {THEMES.map((theme) => {
              const on = settings?.theme === theme.key;
              return (
                <button
                  key={theme.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    // 저장이 끝나기 전에 먼저 입혀야 누른 순간 바뀐다
                    applyTheme(theme.key);
                    void setTheme(theme.key);
                  }}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                >
                  <span
                    className={`size-9 rounded-full transition ${
                      on ? "ring-2 ring-ink/30 ring-offset-2 ring-offset-surface" : ""
                    }`}
                    style={{ background: theme.swatch }}
                  />
                  <span
                    className={`truncate text-tiny ${on ? "font-medium text-ink" : "text-ink-soft"}`}
                  >
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-tiny leading-snug text-ink-faint">
            젤리 색은 그대로예요. 바탕과 뚜껑, 선반 색만 바뀝니다.
          </p>
        </div>

        <h2 className="mt-6 mb-2 px-1 text-xs tracking-wide text-ink-soft">소리</h2>
        <button
          type="button"
          onClick={() => {
            const next = !settings?.muted;
            void setMuted(next);
            if (!next) playShake(14);
          }}
          aria-pressed={!settings?.muted}
          className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left transition active:scale-[.99]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium">병 흔드는 소리</span>
            <span className="mt-0.5 block text-xs leading-snug text-ink-soft">
              병을 톡 칠 때 젤리 부딪히는 소리가 나요
            </span>
          </span>
          <span
            className={`relative h-6 w-11 flex-none rounded-full transition ${
              settings?.muted ? "bg-line" : "bg-accent"
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${
                settings?.muted ? "left-0.5" : "left-[1.375rem]"
              }`}
            />
          </span>
        </button>

        <h2 className="mt-6 mb-2 px-1 text-xs tracking-wide text-ink-soft">저장</h2>
        <section className="rounded-2xl bg-surface p-4">
          <p className="text-base font-medium">이 기기에만 저장돼요</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            기록과 사진이 폰 안에만 있어요. 서버로 나가지 않는 대신,
            <b className="font-medium text-ink"> 사본도 여기 하나뿐</b>입니다.
          </p>
          <p className="mt-2.5 text-tiny text-ink-faint tabular-nums">
            젤리 {stats?.jellies ?? 0}종 · 기록 {stats?.entries ?? 0}건
            {stats?.lastBackup
              ? ` · 마지막 백업 ${format(stats.lastBackup, "yyyy.MM.dd")}`
              : " · 아직 백업한 적 없음"}
          </p>
        </section>

        <h2 className="mt-6 mb-2 px-1 text-xs tracking-wide text-ink-soft">백업</h2>
        <div className="flex flex-col gap-2">
          <Row
            title="백업 파일 내려받기"
            desc="기록과 사진을 파일 하나로. 한 달에 한 번이면 충분해요"
            action={busy === "export" ? "만드는 중" : "내려받기"}
            disabled={Boolean(busy)}
            onClick={onExport}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onImport(e.target.files?.[0])}
          />
          <Row
            title="백업에서 되살리기"
            desc="지금 기기에 있는 기록은 지우지 않고 합칩니다"
            action={busy === "import" ? "읽는 중" : "파일 고르기"}
            disabled={Boolean(busy)}
            onClick={() => fileRef.current?.click()}
          />
        </div>

        {note ? <p className="mt-3 px-1 text-sm text-accent">{note}</p> : null}
        {error ? <p className="mt-3 px-1 text-sm text-accent">{error}</p> : null}

        <h2 className="mt-6 mb-2 px-1 text-xs tracking-wide text-ink-soft">설명서</h2>
        {/*
          라우터가 아니라 그냥 주소다. 그리고 반드시 새 창으로 띄운다 -
          홈 화면 앱 안에서 그대로 이동하면 뒤로 갈 방법이 없어서 갇힌다.
        */}
        <a
          href="/manual/"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 transition active:scale-[.99]"
        >
          <span className="text-2xl leading-none">📖</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base">젤리젤리 설명서</span>
            <span className="block text-xs text-ink-soft">
              화면마다 뭘 할 수 있는지, 홈 화면에 어떻게 추가하는지
            </span>
          </span>
          <span className="text-lg text-ink-faint">›</span>
        </a>

        <h2 className="mt-6 mb-2 px-1 text-xs tracking-wide text-ink-soft">
          {standalone ? "지금 어디에 담기고 있나" : "홈 화면에 추가"}
        </h2>
        {standalone ? (
          <section className="mb-2 rounded-2xl bg-accent-bg p-4">
            <p className="text-base font-medium text-accent">홈 화면 앱으로 열려 있어요</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              여기가 기록이 가장 안전하게 쌓이는 자리예요. 앞으로도 홈 화면 아이콘으로
              열어 주세요.
            </p>
          </section>
        ) : null}
        <section className="rounded-2xl bg-surface p-4">
          <p className="text-xs leading-relaxed text-ink-soft">
            <b className="font-medium text-ink">공유 → 홈 화면에 추가</b>를 눌러 앱처럼 쓰세요.
            사파리든 크롬이든 됩니다. 탭으로만 쓰면 한동안 안 열었을 때
            저장소가 지워질 수 있어요.
          </p>
          <p className="mt-2 text-tiny leading-relaxed text-ink-faint">
            기록은 <b className="font-medium text-ink-soft">브라우저마다, 그리고 홈 화면 앱과
            브라우저 탭 사이에도</b> 따로 쌓입니다. 지금 모은 젤리를 옮기려면
            먼저 백업 파일을 내려받으세요.
          </p>
        </section>

        <h2 className="mt-6 mb-2 px-1 text-xs tracking-wide text-ink-soft">위험한 일</h2>
        {confirmWipe ? (
          <section className="rounded-2xl bg-surface p-4">
            <p className="text-sm leading-relaxed">
              젤리와 기록을 <b>전부</b> 지웁니다. 되돌릴 수 없어요.
              <br />
              <span className="text-ink-soft">백업 파일이 있는지 먼저 확인하세요.</span>
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmWipe(false)}
                className="flex-1 rounded-xl bg-line py-2.5 text-base"
              >
                안 지울래요
              </button>
              <button
                type="button"
                onClick={onWipe}
                disabled={busy === "wipe"}
                className="flex-1 rounded-xl bg-accent py-2.5 text-base text-white disabled:opacity-50"
              >
                {busy === "wipe" ? "지우는 중" : "정말 지우기"}
              </button>
            </div>
          </section>
        ) : (
          <Row
            title="모든 기록 지우기"
            desc="되돌릴 수 없어요"
            action="지우기"
            disabled={Boolean(busy)}
            onClick={() => setConfirmWipe(true)}
          />
        )}

        <p className="mt-8 text-center text-tiny text-ink-faint">젤리젤리 · 혼자 쓰는 기록장</p>
      </main>
    </>
  );
}

function Row({
  title,
  desc,
  action,
  disabled,
  onClick,
}: {
  title: string;
  desc: string;
  action: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left transition active:scale-[.99] disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{desc}</span>
      </span>
      <span className="flex-none rounded-full bg-accent-bg px-3 py-1.5 text-xs font-medium text-accent">
        {action}
      </span>
    </button>
  );
}

/** 이름 고치기. 바뀐 게 있을 때만 저장 버튼이 살아난다. */
function NicknameRow({ initial }: { initial: string }) {
  const [draft, setDraft] = useState(initial);
  const trimmed = draft.trim();
  const changed = trimmed.length > 0 && trimmed !== initial;

  return (
    <form
      className="flex items-center gap-2 rounded-2xl bg-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (changed) void setNickname(trimmed);
      }}
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, 12))}
        maxLength={12}
        enterKeyHint="done"
        className="min-w-0 flex-1 rounded-xl bg-bg px-3 py-2 text-md outline-none focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
      />
      <button
        type="submit"
        disabled={!changed}
        className="flex-none rounded-full bg-accent-bg px-3.5 py-2 text-sm font-medium text-accent disabled:opacity-35"
      >
        저장
      </button>
    </form>
  );
}
