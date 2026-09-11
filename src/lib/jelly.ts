import type { JellyColor, JellyShape } from "../data/types";

export const JELLY_COLORS: Record<JellyColor, string> = {
  grape: "#8E5BC9",
  berry: "#EF5D7A",
  green: "#7CC36A",
  orange: "#F59940",
  cola: "#A9673F",
  lemon: "#EFC93C",
  soda: "#5BB8E0",
  peach: "#F79EA8",
};

/** 카드 배경 — 알맹이 색을 아주 연하게 깐 것 */
export const JELLY_TINTS: Record<JellyColor, string> = {
  grape: "#F1E6FA",
  berry: "#FDE6EA",
  green: "#E8F5E4",
  orange: "#FDEEDE",
  cola: "#F3E9E2",
  lemon: "#FBF3D8",
  soda: "#E3F3FA",
  peach: "#FDECEE",
};

export const COLOR_NAMES: Record<JellyColor, string> = {
  grape: "포도",
  berry: "딸기",
  green: "청포도",
  orange: "오렌지",
  cola: "콜라",
  lemon: "레몬",
  soda: "소다",
  peach: "복숭아",
};

export const SHAPE_NAMES: Record<JellyShape, string> = {
  bear: "곰",
  worm: "벌레",
  ring: "링",
  cube: "큐브",
  heart: "하트",
  bottle: "콜라병",
};

export const SHAPE_KEYS = Object.keys(SHAPE_NAMES) as JellyShape[];
export const COLOR_KEYS = Object.keys(COLOR_NAMES) as JellyColor[];
