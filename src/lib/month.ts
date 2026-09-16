import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";

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

/** 병마다 다른 더미가 나오도록 달에서 씨앗을 만든다 */
export function seedFromKey(key: string): number {
  let h = 17;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  return h || 7;
}
