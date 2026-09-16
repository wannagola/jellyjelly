import { addMonths, differenceInCalendarMonths, endOfMonth, format, startOfMonth } from "date-fns";

export interface MonthRange {
  key: string;
  label: string;
  start: number;
  end: number;
}

export function monthRange(date: Date): MonthRange {
  return {
    key: format(date, "yyyy-MM"),
    label: format(date, "yyyy년 M월"),
    start: startOfMonth(date).getTime(),
    end: endOfMonth(date).getTime(),
  };
}

export function shiftMonth(date: Date, delta: number): Date {
  return addMonths(date, delta);
}

/** 타임스탬프가 속한 달의 키 */
export function monthKeyOf(ts: number): string {
  return format(ts, "yyyy-MM");
}

export function parseMonthKey(key: string): Date | undefined {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return undefined;
  return new Date(y, m - 1, 1);
}

/**
 * 첫 기록이 있는 달부터 이번 달까지, 빈 달도 빼지 않고 이어서 돌려준다.
 * 빈 병이 선반에 그대로 보여야 "이 달은 비었네" 하고 채우고 싶어진다.
 */
export function monthsFrom(firstTs: number, now = new Date()): MonthRange[] {
  const start = startOfMonth(firstTs);
  const span = Math.max(0, differenceInCalendarMonths(now, start));
  return Array.from({ length: span + 1 }, (_, i) => monthRange(addMonths(start, i)));
}

/** 병마다 다른 더미가 나오도록 달에서 씨앗을 만든다 */
export function seedFromKey(key: string): number {
  let h = 17;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  return h || 7;
}
