import { useState } from "react";
import { Jar } from "../components/Jar";
import { setNickname } from "../lib/settings";
import { buildPile } from "../lib/pile";

const SAMPLE = [
  { id: "a", shape: "bear", color: "orange" },
  { id: "b", shape: "worm", color: "berry" },
  { id: "c", shape: "cube", color: "grape" },
  { id: "d", shape: "ring", color: "soda" },
  { id: "e", shape: "heart", color: "peach" },
  { id: "f", shape: "bottle", color: "cola" },
  { id: "g", shape: "cube", color: "green" },
  { id: "h", shape: "ring", color: "lemon" },
] as const;

/** 첫 실행. 이름 하나만 받고 바로 들여보낸다. */
export function WelcomeScreen() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = name.trim().length > 0;

  async function start() {
    if (!ready) return;
    setBusy(true);
    await setNickname(name);
  }

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-bg px-7">
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Jar quiet className="w-[min(200px,52vw)]" jellyRatio={0.2} items={buildPile([...SAMPLE], 21)} />

        <h1 className="mt-7 font-display text-[30px]">젤리젤리</h1>
        <p className="mt-2 text-center text-[13.5px] leading-relaxed text-ink-soft">
          먹은 젤리를 하나씩 병에 담아 모아요.
          <br />
          뭐라고 불러드릴까요?
        </p>

        <form
          className="mt-6 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 12))}
            placeholder="닉네임"
            enterKeyHint="done"
            maxLength={12}
            className="w-full rounded-2xl bg-surface px-4 py-3 text-center text-[15px] outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
          />
          <button
            type="submit"
            disabled={!ready || busy}
            className="mt-2.5 w-full rounded-2xl bg-accent py-3.5 font-display text-[16px] text-white transition active:scale-[.98] disabled:opacity-35"
          >
            시작하기
          </button>
        </form>

        <p className="mt-3 text-[10.5px] text-ink-faint">나중에 설정에서 바꿀 수 있어요</p>
      </main>
    </div>
  );
}
