import { registerSW } from "virtual:pwa-register";

/**
 * 새 판이 올라오면 알아서 갈아끼운다.
 *
 * 서비스 워커는 한 번 물면 놓지 않는다. 새로 배포해도 이미 깔린 워커가 옛 파일을
 * 그대로 내주고, 새 워커는 다음 번에 열 때에야 자리를 넘겨받는다. 그래서 고친 게
 * 폰에 보이려면 앱을 두 번 열어야 했다 - 한 번은 새 워커를 깔고, 한 번은 그 워커가
 * 내주는 화면을 보려고.
 *
 * 새 워커가 준비되면 바로 자리를 넘기고 화면을 다시 불러온다. 다만 글을 쓰고 있는
 * 중에 새로고침하면 쓰던 게 날아가니, 그때는 손을 뗄 때까지 기다린다.
 */

/** 여기서는 새로고침하지 않는다. 쓰다 만 것이 날아간다. */
function busy(): boolean {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return true;
  return /^\/(finish|record)/.test(window.location.pathname);
}

export function watchForUpdates(): void {
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      const apply = () => {
        if (busy()) {
          window.setTimeout(apply, 4000);
          return;
        }
        void update(true);
      };
      apply();
    },
    onRegisteredSW(_url, registration) {
      // 오래 켜둔 홈 화면 앱은 다시 열 일이 없다. 한 시간에 한 번 새 판이 있는지 본다.
      if (!registration) return;
      window.setInterval(() => void registration.update(), 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void registration.update();
      });
    },
  });
}
