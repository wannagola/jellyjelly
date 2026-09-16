import { useLiveQuery } from "dexie-react-hooks";
import { db, writeSetting } from "../data/db";
import { DEFAULT_THEME, type ThemeKey, isThemeKey } from "./theme";

export interface Settings {
  nickname?: string;
  muted?: boolean;
  theme: ThemeKey;
}

/**
 * 설정을 읽는다. 아직 못 읽었을 때와 "값이 없음"을 구분해야 해서
 * 로딩 중에는 undefined, 다 읽으면 반드시 객체를 돌려준다.
 * 이걸 구분 못 하면 첫 화면에서 닉네임 입력창이 번쩍 스쳐 지나간다.
 */
export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const rows = await db.meta.bulkGet(["nickname", "muted", "theme"]);
    const theme = rows[2]?.value;
    return {
      nickname: rows[0]?.value as string | undefined,
      muted: rows[1]?.value as boolean | undefined,
      theme: isThemeKey(theme) ? theme : DEFAULT_THEME,
    };
  }, []);
}

export const setNickname = (name: string) => writeSetting("nickname", name.trim());
export const setMuted = (muted: boolean) => writeSetting("muted", muted);
export const setTheme = (theme: ThemeKey) => writeSetting("theme", theme);
