import { format } from "date-fns";
import { useState } from "react";
import { db, readSetting } from "../data/db";
import { useLiveQuery } from "dexie-react-hooks";
import { sendCode, signOut, useSession, verifyCode } from "../lib/auth";
import { syncEnabled } from "../lib/supabase";
import { type SyncReport, resetPullCursor, syncNow, wipeLocalAfterSignOut } from "../lib/sync";

/** 로그인과 동기화. 서버를 안 붙였으면 아예 안 보인다. */
export function AccountSection() {
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const [error, setError] = useState<string>();

  const pending = useLiveQuery(
    async () => {
      const [j, e, g] = await Promise.all([
        db.jellies.where("dirty").equals(1).count(),
        db.entries.where("dirty").equals(1).count(),
        db.graveyard.where("dirty").equals(1).count(),
      ]);
      return j + e + g;
    },
    [],
    0,
  );
  const lastSynced = useLiveQuery(() => readSetting<number>("syncPulledAt"), []);

  if (!syncEnabled) return null;
  if (loading) return null;

  async function run<T>(job: () => Promise<T>, done?: (v: T) => void) {
    setBusy(true);
    setError(undefined);
    setNote(undefined);
    try {
      done?.(await job());
    } catch (err) {
      setError(err instanceof Error ? err.message : "잘 안 됐어요");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <section className="rounded-2xl bg-surface p-4">
        <p className="text-base font-medium">로그인하면 어느 기기에서나</p>
        <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-soft">
          폰을 바꿔도, 다른 브라우저에서 열어도 같은 병을 봅니다.
          {stage === "email" ? " 메일로 여섯 자리 코드를 보내드려요." : ""}
        </p>

        {stage === "email" ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () => sendCode(email),
                () => {
                  setStage("code");
                  setNote("메일로 코드를 보냈어요");
                },
              );
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              autoComplete="email"
              className="min-w-0 flex-1 rounded-xl bg-bg px-3 py-2.5 text-base outline-none focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
            />
            <button
              type="submit"
              disabled={busy || !email.includes("@")}
              className="flex-none rounded-xl bg-accent px-4 text-base text-white disabled:opacity-40"
            >
              코드 받기
            </button>
          </form>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () => verifyCode(email, code),
                async () => {
                  // 로그인하면 서버 것을 처음부터 다시 받는다
                  await resetPullCursor();
                  await syncNow();
                },
              );
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="여섯 자리"
              autoComplete="one-time-code"
              className="min-w-0 flex-1 rounded-xl bg-bg px-3 py-2.5 text-center text-base tracking-[0.3em] tabular-nums outline-none focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
            />
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="flex-none rounded-xl bg-accent px-4 text-base text-white disabled:opacity-40"
            >
              로그인
            </button>
          </form>
        )}

        {stage === "code" ? (
          <button
            type="button"
            onClick={() => {
              setStage("email");
              setCode("");
              setNote(undefined);
            }}
            className="mt-2 text-xs text-ink-faint"
          >
            메일 주소 다시 입력
          </button>
        ) : null}

        {note ? <p className="mt-2.5 text-xs text-accent">{note}</p> : null}
        {error ? <p className="mt-2.5 text-xs text-accent">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-surface p-4">
      <p className="text-base font-medium">{session.user.email}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        기록이 서버에도 올라가 있어요. 다른 기기에서 같은 메일로 로그인하면 그대로 보입니다.
      </p>
      <p className="mt-2 text-tiny text-ink-faint tabular-nums">
        {lastSynced ? `마지막 동기화 ${format(lastSynced, "M월 d일 HH:mm")}` : "아직 동기화 전"}
        {pending > 0 ? ` · 올릴 것 ${pending}개` : " · 모두 올라감"}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(syncNow, (report?: SyncReport) => {
              if (!report) return;
              setNote(
                `올림 ${report.pushed} · 받음 ${report.pulled}` +
                  (report.photosLeft > 0 ? ` · 사진 ${report.photosLeft}장 남음` : ""),
              );
            })
          }
          className="flex-1 rounded-xl bg-accent-bg py-2.5 text-base font-medium text-accent disabled:opacity-40"
        >
          {busy ? "맞추는 중" : "지금 동기화"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await syncNow();
              await signOut();
              await wipeLocalAfterSignOut();
              location.reload();
            })
          }
          className="rounded-xl px-4 py-2.5 text-base text-ink-faint disabled:opacity-40"
        >
          로그아웃
        </button>
      </div>

      {note ? <p className="mt-2.5 text-xs text-accent">{note}</p> : null}
      {error ? <p className="mt-2.5 text-xs text-accent">{error}</p> : null}
    </section>
  );
}
