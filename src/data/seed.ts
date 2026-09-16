import type { JellyColor, JellyShape } from "./types";

/**
 * 첫 실행 때 도감에 깔리는 젤리들. 편의점에서 실제로 살 수 있는 것들이라
 * 설치하자마자 검색이 된다. 내가 먹은 기록은 여기서 시작하지 않는다 —
 * 병과 수집 개수는 어디까지나 실제 기록만 센다.
 */
export const SEED_JELLIES: {
  name: string;
  brand: string;
  shape: JellyShape;
  color: JellyColor;
}[] = [
  { name: "하리보 골드베렌", brand: "하리보", shape: "bear", color: "orange" },
  { name: "하리보 해피콜라", brand: "하리보", shape: "bottle", color: "cola" },
  { name: "하리보 스타믹스", brand: "하리보", shape: "ring", color: "peach" },
  { name: "마이구미 포도", brand: "오리온", shape: "cube", color: "grape" },
  { name: "마이구미 딸기", brand: "오리온", shape: "cube", color: "berry" },
  { name: "왕꿈틀이", brand: "오리온", shape: "worm", color: "berry" },
  { name: "젤리뽀 청포도", brand: "롯데", shape: "cube", color: "green" },
  { name: "트롤리 콜라보틀", brand: "트롤리", shape: "bottle", color: "cola" },
  { name: "트롤리 지구젤리", brand: "트롤리", shape: "ring", color: "soda" },
  { name: "코로로 포도", brand: "UHA", shape: "cube", color: "grape" },
  { name: "요구르트 젤리", brand: "서주", shape: "bottle", color: "soda" },
  { name: "복숭아 하트젤리", brand: "젤리밸리", shape: "heart", color: "peach" },
];
