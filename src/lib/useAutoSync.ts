import { useEffect } from "react";
import { useSession } from "./auth";
import { syncNow } from "./sync";

/**
 * 알아서 맞춘다. 앱을 열 때, 다시 보러 올 때, 그리고 가끔.
 * 실패해도 조용히 넘어간다 - 기기에는 이미 적혀 있으니 다음 기회에 올리면 된다.
 */
export function useAutoSync(): void {
  const { session } = useSession();

  useEffect(() => {
    if (!session) return;
    let alive = true;

    const run = () => {
      if (!alive || document.visibilityState === "hidden") return;
      void syncNow().catch(() => undefined);
    };

    run();
    const timer = setInterval(run, 120_000);
    document.addEventListener("visibilitychange", run);
    window.addEventListener("online", run);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("online", run);
    };
  }, [session]);
}
