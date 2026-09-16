import { getChoseong } from "es-hangul";

/** 초성 질의는 자모만, 나머지는 그냥 소문자로 */
const strip = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** ㅁㄱㅁ 로 마이구미(ㅁㅇㄱㅁ)를 찾을 수 있어야 한다 — 순서만 맞으면 통과 */
function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return i === needle.length;
}

/**
 * 이름·브랜드를 상대로 한 관대한 검색.
 * "하리보", "haribo", "ㅎㄹㅂ" 이 모두 같은 젤리를 찾아야 한다.
 */
export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const q = strip(query);
  if (!q) return true;

  const hay = strip(fields.filter(Boolean).join(" "));
  if (hay.includes(q)) return true;

  const qCho = strip(getChoseong(query));
  if (!qCho) return false;
  return isSubsequence(qCho, strip(getChoseong(hay)));
}
