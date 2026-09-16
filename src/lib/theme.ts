export const THEMES = [
  { key: "strawberry", name: "딸기우유", swatch: "#E0568C", bg: "#FBF4F5" },
  { key: "greengrape", name: "청포도", swatch: "#4F9D58", bg: "#F2F8F1" },
  { key: "soda", name: "소다", swatch: "#2F8FBE", bg: "#F1F6FA" },
  { key: "grape", name: "포도", swatch: "#7C53C2", bg: "#F6F2FA" },
  { key: "cocoa", name: "코코아", swatch: "#A4693C", bg: "#F8F4F0" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];
export const DEFAULT_THEME: ThemeKey = "strawberry";

const STORAGE_KEY = "jj-theme";

export function isThemeKey(value: unknown): value is ThemeKey {
  return THEMES.some((t) => t.key === value);
}

/**
 * 테마를 실제로 입힌다.
 *
 * 저장소(IndexedDB)는 비동기라 앱이 뜬 뒤에야 읽힌다. 그동안 기본 분홍이
 * 한 번 번쩍이지 않도록 localStorage 에도 같이 적어두고, index.html 이
 * 그림 그리기 전에 먼저 꺼내 쓴다.
 */
export function applyTheme(key: ThemeKey): void {
  const theme = THEMES.find((t) => t.key === key) ?? THEMES[0];

  if (theme.key === DEFAULT_THEME) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.key;

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.bg);

  try {
    localStorage.setItem(STORAGE_KEY, theme.key);
  } catch {
    // 시크릿 모드 등에서 막히면 그냥 넘어간다. 다음 실행에 한 번 번쩍일 뿐이다.
  }
}
