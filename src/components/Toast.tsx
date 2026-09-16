import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/** 기록 직후 한 줄. 화면을 막지 않고 잠깐 떴다 사라진다. */
export function Toast({ message, duration = 2200 }: { message?: string; duration?: number }) {
  // 지워진 메시지를 기억해 둔다. 렌더 중이 아니라 타이머가 끝날 때 바뀐다.
  const [dismissed, setDismissed] = useState<string>();

  useEffect(() => {
    if (!message || dismissed === message) return;
    const timer = setTimeout(() => setDismissed(message), duration);
    return () => clearTimeout(timer);
  }, [message, duration, dismissed]);

  const shown = message && dismissed !== message ? message : undefined;

  return (
    <AnimatePresence>
      {shown ? (
        <motion.p
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-none fixed inset-x-0 bottom-28 z-30 mx-auto w-fit max-w-[80%] rounded-full bg-ink/90 px-4 py-2 text-center text-[13px] text-white"
        >
          {shown}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
