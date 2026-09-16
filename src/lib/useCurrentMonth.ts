import { useEffect, useState } from "react";
import { dayKeyOf, monthKeyOf } from "./month";

/**
 * 지금이 몇 월인지. 렌더 중에 Date.now() 를 부르면 값이 언제 바뀔지 알 수 없고,
 * 무엇보다 홈 화면에 띄운 앱은 며칠씩 열려 있다. 10월 1일 0시가 지나도
 * 화면은 9월에 머물러서 기록 버튼이 잠긴 채로 남는다.
 */
export function useCurrentMonth(): string {
  const [key, setKey] = useState(() => monthKeyOf(Date.now()));

  useEffect(() => {
    const sync = () => setKey(monthKeyOf(Date.now()));
    const timer = setInterval(sync, 60_000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return key;
}

/**
 * 오늘 날짜 (yyyy-MM-dd).
 *
 * 달과 같은 이유로 렌더 중에 구하지 않는다. 며칠씩 열려 있는 홈 화면 앱에서
 * 자정이 지나도 어제에 머무르면 '모은 기간'이 하루 모자란 채로 굳는다.
 */
export function useToday(): string {
  const [key, setKey] = useState(() => dayKeyOf(Date.now()));

  useEffect(() => {
    const sync = () => setKey(dayKeyOf(Date.now()));
    const timer = setInterval(sync, 60_000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return key;
}
