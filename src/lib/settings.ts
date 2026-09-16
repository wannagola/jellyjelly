import { useLiveQuery } from "dexie-react-hooks";
import { db, writeSetting } from "../data/db";
import { DEFAULT_THEME, type ThemeKey, isThemeKey } from "./theme";

export interface Settings {
  nickname?: string;
  muted?: boolean;
  /** 폰을 기울이면 젤리가 쏠리게 할지. 안 정했으면 켜둔다. */
  tilt: boolean;
  theme: ThemeKey;
}

/**
 * 설정을 읽는다. 아직 못 읽었을 때와 "값이 없음"을 구분해야 해서
 * 로딩 중에는 undefined, 다 읽으면 반드시 객체를 돌려준다.
 * 이걸 구분 못 하면 첫 화면에서 닉네임 입력창이 번쩍 스쳐 지나간다.
 */
export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const rows = await db.meta.bulkGet(["nickname", "muted", "theme", "tilt"]);
    const theme = rows[2]?.value;
    return {
      nickname: rows[0]?.value as string | undefined,
      muted: rows[1]?.value as boolean | undefined,
      // 값이 없으면 켜진 것으로 본다. 안드로이드는 물어볼 것도 없이 바로 된다.
      tilt: rows[3]?.value !== false,
      theme: isThemeKey(theme) ? theme : DEFAULT_THEME,
    };
  }, []);
}

export const setNickname = (name: string) => writeSetting("nickname", name.trim());
export const setMuted = (muted: boolean) => writeSetting("muted", muted);
export const setTheme = (theme: ThemeKey) => writeSetting("theme", theme);
export const setTiltOn = (on: boolean) => writeSetting("tilt", on);
