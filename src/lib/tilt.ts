import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 폰을 기울이면 젤리가 그쪽으로 쏠린다.
 *
 * iOS 13 부터 기울기를 읽으려면 먼저 물어봐야 하고, 그 물음은 사용자가 뭔가를
 * 누른 바로 그 순간에만 띄울 수 있다. 앱이 켜지자마자 부르면 조용히 거절된다.
 * 그래서 병을 톡 치는 동작에 얹었다 - 어차피 병을 만지는 순간이라 물어보기 자연스럽다.
 *
 * '물어봐야 하는 기기인가'로 갈라서는 안 된다. 크롬도 requestPermission 을
 * 갖고 있으면서 정작 묻지 않고 그냥 값을 준다. 그래서 듣기는 언제나 붙여두고,
 * 쓸 만한 값이 실제로 들어왔을 때에만 켜진 것으로 친다.
 *
 * 허락은 페이지를 다시 열 때마다 새로 받아야 한다. 애플이 그렇게 정해놨다.
 */

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** 손에 들고만 있어도 이만큼은 기울어져 있다. 그 안은 안 움직인 걸로 본다. */
const DEAD = 5;
/** 이 이상 기울여도 더는 안 쏠린다 */
const FULL = 34;

function ctor(): OrientationCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.DeviceOrientationEvent as OrientationCtor | undefined;
}

export function tiltSupported(): boolean {
  return Boolean(ctor());
}

/**
 * 물어보면 켜질 수 있는 기기인가.
 *
 * 데스크톱 크롬도 requestPermission 을 갖고 있어서 그것만 보면 노트북에도
 * 버튼이 뜬다. 손가락이 닿는 기기인지까지 같이 본다.
 */
export function tiltCanAsk(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof ctor()?.requestPermission === "function" && navigator.maxTouchPoints > 0;
}

/**
 * -1(왼쪽) ~ 1(오른쪽). 값이 안 들어오는 기기에서는 내내 0 이다.
 *
 * 기울기는 초당 예순 번씩 들어온다. 그대로 화면에 꽂으면 손 떨림까지 그려져서
 * 젤리가 부들부들 떤다. 그래서 값은 ref 에 받아 부드럽게 깎고, 눈에 보일 만큼
 * 바뀌었을 때만 화면에 알린다.
 */
export function useTilt(): { tilt: number; live: boolean; enable: () => Promise<boolean> } {
  const [tilt, setTilt] = useState(0);
  /** 쓸 만한 값이 한 번이라도 들어왔나 */
  const [live, setLive] = useState(false);
  const raw = useRef(0);
  const smooth = useRef(0);
  /**
   * 허락을 받고 나면 듣기를 새로 건다.
   * 허락 전에 걸어둔 귀에는 값이 안 들어오는 기기가 있다.
   */
  const [rearm, setRearm] = useState(0);

  /* 센서는 바깥 세상이고 여기가 그걸 리액트로 옮기는 자리다.
     effect 안의 setState 를 막는 규칙은 이 경우를 위한 게 아니다. */
  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => {
    if (!tiltSupported()) return;
    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma;
      // 허락 전에는 이벤트가 오더라도 값이 비어 있다
      if (gamma === null || gamma === undefined) return;
      setLive(true);
      const away = Math.abs(gamma) - DEAD;
      raw.current = away <= 0 ? 0 : Math.sign(gamma) * Math.min(1, away / (FULL - DEAD));
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [rearm]);

  useEffect(() => {
    if (!live) return;
    let raf = 0;
    const step = () => {
      smooth.current += (raw.current - smooth.current) * 0.14;
      // 스프링이 어차피 한 번 더 부드럽게 해주니 잔떨림까지 전할 필요는 없다
      if (Math.abs(smooth.current - tilt) > 0.025) setTilt(smooth.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [live, tilt]);
  /* oxlint-enable react/set-state-in-effect */

  /** 아이폰에 물어본다. 사용자가 뭔가를 누른 직후에만 통한다. */
  const enable = useCallback(async () => {
    const Ctor = ctor();
    if (typeof Ctor?.requestPermission !== "function") return false;
    try {
      // 누른 그 순간에 바로 불러야 한다. 여기서 한 번이라도 기다리면 거절된다.
      const answer = await Ctor.requestPermission();
      if (answer !== "granted") return false;
      setRearm((n) => n + 1);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { tilt, live, enable };
}
