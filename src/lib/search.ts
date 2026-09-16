import { getChoseong } from "es-hangul";

const strip = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** 한글 호환 자모만으로 된 질의 (ㅁㄱㅁ 같은 것) */
const ALL_JAMO = /^[\u3131-\u318E]+$/;

/** ㅁㄱㅁ 로 마이구미(ㅁㅇㄱㅁ)를 찾을 수 있어야 한다 - 순서만 맞으면 통과 */
function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return i === needle.length;
}

/**
 * 관대하게 찾되, 얼마나 잘 맞았는지를 같이 돌려준다.
 * 도감이 70종을 넘으면서 "찾느냐"보다 "제일 그럴듯한 게 위에 오느냐"가 중요해졌다.
 * 0이면 안 맞은 것.
 */
export function scoreMatch(query: string, name: string, brand?: string): number {
  const q = strip(query);
  if (!q) return 1;

  const n = strip(name);
  if (n.startsWith(q)) return 100;
  if (n.includes(q)) return 80;
  if (brand && strip(brand).includes(q)) return 60;

  // 초성 검색은 질의가 자모만일 때에만. "콜라"를 ㅋㄹ로 바꿔 훑으면
  // 콜라겐이든 코리아든 다 걸려서 결과가 쓸모없어진다.
  if (!ALL_JAMO.test(q)) return 0;

  const qCho = strip(getChoseong(query));
  if (!qCho) return 0;

  const nCho = strip(getChoseong(name));
  if (nCho.startsWith(qCho)) return 50;
  if (nCho.includes(qCho)) return 40;
  if (brand && strip(getChoseong(brand)).includes(qCho)) return 30;
  if (isSubsequence(qCho, nCho)) return 20;

  return 0;
}

/** 점수 순으로 거르고 정렬한다. 같은 점수면 짧은 이름이 위로. */
export function searchJellies<T extends { name: string; brand?: string }>(
  items: T[],
  query: string,
): T[] {
  if (!query.trim()) return items;
  return items
    .map((item) => ({ item, score: scoreMatch(query, item.name, item.brand) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length)
    .map((row) => row.item);
}
