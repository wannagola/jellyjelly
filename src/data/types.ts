/** 젤리 알맹이 모양 — 사진이 없을 때 젤리의 얼굴이 된다 */
export type JellyShape = "bear" | "worm" | "ring" | "cube" | "heart" | "bottle";

/** 젤리 색 — 병에 쌓이는 알맹이 색이자 카드 배경색의 근거 */
export type JellyColor =
  | "grape"
  | "berry"
  | "green"
  | "orange"
  | "cola"
  | "lemon"
  | "soda"
  | "peach";

/** 카탈로그: 젤리 그 자체. 같은 젤리를 열 번 먹어도 하나다. */
export interface Jelly {
  id: string;
  name: string;
  brand?: string;
  shape: JellyShape;
  color: JellyColor;
  /** 봉지 사진. 없으면 shape+color가 대신한다. */
  photo?: Blob;
  kcal?: number;
  note?: string;
  /** 최애 표시 */
  favorite?: boolean;
  /** 앱이 깔아준 젤리라는 표시. 직접 만든 젤리에는 없다. */
  seedKey?: string;
  createdAt: number;
  updatedAt: number;
}

/** 기록: 젤리를 먹은 한 번의 사건 */
export interface Entry {
  id: string;
  jellyId: string;
  status: "eating" | "done";
  startedAt: number;
  finishedAt?: number;
  rating?: number;
  review?: string;
  texture?: { chewy: number; sour: number; sweet: number };
  /** 그날 찍은 봉지 사진. 젤리 대표 사진과 별개로, 이 한 번의 기록에 붙는다. */
  photo?: Blob;
  createdAt: number;
  updatedAt: number;
}
