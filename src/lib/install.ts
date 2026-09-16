import { useEffect, useState } from "react";

/**
 * 홈 화면에 추가하기.
 *
 * 버튼 한 번으로 되는 곳과 안 되는 곳이 갈린다.
 *
 * 안드로이드 크롬은 설치할 만하다고 판단되면 beforeinstallprompt 를 던진다.
 * 그걸 붙잡아 뒀다가 사용자가 버튼을 누를 때 다시 꺼내 쓰면 진짜 설치 창이 뜬다.
 *
 * iOS 에는 그런 게 없다. 애플이 안 만들어 줬다. 공유 시트를 프로그램이 열 방법도,
 * 홈 화면에 무언가를 꽂을 방법도 없다. 그래서 iOS 에서는 버튼을 만들 수 없고,
 * 어디를 눌러야 하는지 그림으로 짚어주는 게 최선이다. 있지도 않은 버튼을
 * 띄워놓고 아무 일도 안 일어나게 두는 것보다 낫다.
 *
 * 다만 '사파리로 옮기라'고 할 일은 이제 거의 없다. iOS 16.4 부터 크롬·엣지·
 * 파이어폭스도 자기 공유 메뉴에서 홈 화면에 추가를 할 수 있고, 그렇게 만든
 * 아이콘도 주소창 없는 제 창으로 열린다. 카카오톡·인스타그램처럼 앱 안에
 * 박힌 브라우저만 못 한다.
 */

/** 크롬이 던져주는 설치 신호. 표준이 아니라서 타입을 직접 적는다. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let saved: InstallPromptEvent | undefined;
const listeners = new Set<() => void>();

const tell = () => {
  for (const fn of listeners) fn();
};

/**
 * 신호는 앱이 뜨자마자 날아온다. 설정 화면이 열릴 때 듣기 시작하면 이미 늦어서
 * 버튼이 영영 안 생긴다. 그래서 main 에서 제일 먼저 부른다.
 */
export function watchInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    // 크롬이 알아서 띄우는 배너를 막고 우리 버튼으로 돌린다
    e.preventDefault();
    saved = e as InstallPromptEvent;
    tell();
  });
  window.addEventListener("appinstalled", () => {
    saved = undefined;
    tell();
  });
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export type InstallWay =
  /** 이미 홈 화면 앱으로 열려 있다 */
  | "installed"
  /** 버튼 한 번이면 된다 */
  | "button"
  /** 사파리 공유 시트로 직접 해야 한다 */
  | "ios-safari"
  /** iOS 의 크롬·엣지·파이어폭스. 여기서도 되지만 공유 버튼 자리가 다르다. */
  | "ios-browser"
  /** 카카오톡·인스타그램처럼 앱 안에 박힌 브라우저. 밖으로 나가야 한다. */
  | "ios-inapp"
  /** 알 길이 없다. 그냥 설명만 */
  | "manual";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if ((navigator as NavigatorWithStandalone).standalone) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iP(hone|ad|od)/.test(navigator.userAgent)) return true;
  // 아이패드는 사파리에서 스스로를 맥이라고 말한다. 손가락이 닿는 맥은 없다.
  return /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

/** 제 몫을 하는 브라우저인가, 앱 안에 박힌 창인가 */
const IOS_BROWSER = /CriOS|FxiOS|EdgiOS|Whale/;
const IOS_INAPP = /KAKAO|Instagram|FBAN|FBAV|NAVER\(inapp|DaumApps|Line\//;

function iosKind(): InstallWay {
  const ua = navigator.userAgent;
  if (IOS_INAPP.test(ua)) return "ios-inapp";
  if (IOS_BROWSER.test(ua)) return "ios-browser";
  return "ios-safari";
}

/**
 * 지금 이 브라우저에서 홈 화면에 추가하는 방법.
 * 화면이 이걸 보고 버튼을 낼지 안내를 낼지 정한다.
 */
export function useInstallWay(): InstallWay {
  const [, bump] = useState(0);

  useEffect(() => {
    const sync = () => bump((n) => n + 1);
    listeners.add(sync);
    return () => void listeners.delete(sync);
  }, []);

  if (isStandalone()) return "installed";
  if (saved) return "button";
  if (isIOS()) return iosKind();
  return "manual";
}

/**
 * 설치 창을 띄운다. 신호를 한 번 쓰면 다시 못 쓰기 때문에 꺼내면서 버린다.
 * 사용자가 취소하면 크롬이 나중에 신호를 다시 준다.
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = saved;
  if (!event) return "unavailable";
  saved = undefined;
  tell();
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } catch {
    return "dismissed";
  }
}
