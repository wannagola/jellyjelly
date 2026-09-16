import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { db, writeSetting } from "../data/db";

const SEEN = "manualHintSeen";

/**
 * 설명서가 어디 있는지 알려준다.
 *
 * 가운데 띄우는 창으로 "설정에 있어요" 라고만 하면 창을 닫는 순간
 * 어디였는지 잊는다. 그래서 톱니 바로 아래에 붙이고 꼭지를 위로 세워서
 * 글이 아니라 자리로 알려준다. 그러고도 못 찾을 사람을 위해
 * 여기서 바로 열 수 있는 버튼을 같이 둔다.
 *
 * 닫는 방법이 둘이다. 그냥 닫으면 다음에 열 때 또 나오고,
 * '다시 보지 않기' 를 눌러야 영영 안 나온다. 한 번 보고 흘려버린 사람은
 * 다시 만나야 하고, 됐다고 말한 사람은 다시 만나면 안 된다.
 */
export function FirstRunHint() {
  const seen = useLiveQuery(async () => (await db.meta.get(SEEN))?.value ?? false, []);
  // 이번에만 닫은 것. 저장하지 않으니 다음에 열면 다시 나온다.
  const [hidden, setHidden] = useState(false);

  const close = () => setHidden(true);
  const never = () => {
    setHidden(true);
    void writeSetting(SEEN, true);
  };

  useEffect(() => {
    if (seen !== false || hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seen, hidden]);

  // undefined 는 '아직 못 읽었다'. 여기서 그리면 첫 화면에 창이 번쩍 스친다.
  if (seen !== false || hidden) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="닫기"
        onClick={close}
        className="absolute inset-0 w-full bg-ink/25"
      />

      {/* 앱은 가운데 정렬이라 톱니도 화면 끝이 아니라 이 칸의 끝에 있다 */}
      <div className="pointer-events-none relative mx-auto h-full max-w-[480px]">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hint-title"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="pointer-events-auto absolute top-[calc(env(safe-area-inset-top,0px)+3.1rem)] right-3 left-3 rounded-2xl bg-surface p-4 shadow-[0_14px_38px_rgba(59,36,48,.28)]"
        >
          {/* 톱니를 가리키는 꼭지 */}
          <span className="absolute -top-[7px] right-[18px] size-3.5 rotate-45 rounded-[3px] bg-surface" />

          <h2 id="hint-title" className="font-display text-lg">
            설명서 먼저 보실래요?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            오른쪽 위 <b className="font-medium text-ink">톱니 버튼 ⚙</b> 안에{" "}
            <b className="font-medium text-ink">설명서</b>가 있어요. 화면마다 뭘 할 수 있는지,
            홈 화면에 어떻게 추가하는지 다 적어뒀습니다. 한 번 읽어보시길 권해요.
          </p>

          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-xl bg-accent-bg py-2.5 text-sm font-medium text-accent transition active:scale-[.98]"
            >
              나중에
            </button>
            {/* 홈 화면 앱 안에서 그대로 이동하면 뒤로 갈 방법이 없어서 갇힌다 */}
            <a
              href="/manual/"
              target="_blank"
              rel="noopener"
              onClick={close}
              className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-medium text-white transition active:scale-[.98]"
            >
              설명서 보기
            </a>
          </div>

          <button
            type="button"
            onClick={never}
            className="mt-2 w-full py-1.5 text-tiny text-ink-faint transition active:scale-[.98]"
          >
            다시 보지 않기
          </button>
        </motion.div>
      </div>
    </div>
  );
}
