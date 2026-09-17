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
  /** 아직 안 먹어봤는데 먹어보고 싶은 것. 편의점에서 뭘 살지 고를 때 본다. */
  wish?: boolean;
  /** 앱이 깔아준 젤리라는 표시. 직접 만든 젤리에는 없다. */
  seedKey?: string;
  createdAt: number;
  updatedAt: number;
  /** 서버에 아직 못 올린 변경. 인덱스를 태우려고 불리언 대신 0/1 을 쓴다. */
  dirty?: 0 | 1;
  /** 서버에 올라간 사진의 경로 */
  photoPath?: string;
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
  dirty?: 0 | 1;
  photoPath?: string;
}

/**
 * 지운 것의 묘비.
 *
 * 줄에 '지움' 표시를 달아두면 화면마다 그걸 걸러내야 하고, 한 군데만 빠뜨려도
 * 지운 젤리가 튀어나온다. 그래서 줄은 진짜로 지우고 지웠다는 사실만 여기 남긴다.
 * 다른 기기가 "얘가 없네" 하고 되살리는 것도 이걸 보고 막는다.
 */
export interface Tombstone {
  id: string;
  kind: "jelly" | "entry";
  deletedAt: number;
  dirty?: 0 | 1;
}
