import { useEffect, useState } from "react";

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS 는 display-mode 대신 navigator.standalone 을 쓴다
  if ((navigator as NavigatorWithStandalone).standalone) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

/**
 * 홈 화면 앱으로 열렸는지.
 *
 * iOS 에서 홈 화면에 추가한 웹앱은 사파리와 저장소가 아예 갈린다.
 * 사파리 탭에서 모은 젤리가 홈 화면 앱에는 없다. 눈에 안 보이는 함정이라
 * 앱이 직접 어디에 담기고 있는지 말해줘야 한다.
 */
export function useIsStandalone(): boolean {
  const [standalone, setStandalone] = useState(readStandalone);

  useEffect(() => {
    const query = window.matchMedia?.("(display-mode: standalone)");
    if (!query) return;
    const sync = () => setStandalone(readStandalone());
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return standalone;
}
