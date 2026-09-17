import type { JellyColor, JellyShape } from "./types";

export interface SeedJelly {
  /** 앱을 업데이트해도 같은 젤리를 두 번 넣지 않기 위한 고정 키 */
  seedKey: string;
  name: string;
  brand: string;
  shape: JellyShape;
  color: JellyColor;
}

/**
 * 국내 편의점 젤리 도감.
 *
 * 대부분은 2026년 9월 기준 GS25·CU·세븐일레븐·이마트24 행사 목록에서 실제로
 * 확인한 제품이고, 나머지는 상시 판매되는 스테디셀러다. 편의점 재고는 주 단위로
 * 바뀌므로 "지금 그 매장에 있다"는 보장은 아니다. 없으면 지우고, 새로 보이면 추가하면 된다.
 *
 * 모양과 색은 어떤 API에도 없어서 제품명을 보고 손으로 정했다. 파우치나 컵에 든
 * 제품은 알맹이 모양이 따로 없어서, 병에 쌓였을 때 보기 좋도록 색에 따라 흩뜨렸다.
 * 틀린 게 보이면 앱에서 바로 고칠 수 있고 고친 값은 업데이트해도 덮어쓰지 않는다.
 */
export const SEED_JELLIES: SeedJelly[] = [
  { seedKey: "하리보-골드베렌", name: "골드베렌", brand: "하리보", shape: "bear", color: "orange" },
  { seedKey: "하리보-해피콜라", name: "해피콜라", brand: "하리보", shape: "bottle", color: "cola" },
  { seedKey: "하리보-스타믹스", name: "스타믹스", brand: "하리보", shape: "ring", color: "peach" },
  { seedKey: "하리보-푸르티부시", name: "푸르티부시", brand: "하리보", shape: "bear", color: "berry" },
  { seedKey: "하리보-계란프라이", name: "계란프라이", brand: "하리보", shape: "ring", color: "lemon" },
  // 알름두들러는 오스트리아 허브 레모네이드다. 봉지 안은 빨강·초록 커플 모양과
  // 금빛 병 모양인데, 병이 제일 많고 제품 얼굴이라 병으로 뒀다.
  { seedKey: "하리보-알름두들러", name: "알름두들러", brand: "하리보", shape: "bottle", color: "lemon" },
  { seedKey: "하리보-요거티스", name: "요거티스", brand: "하리보", shape: "ring", color: "soda" },
  // 2026년 1월 국내 출시. 웃는 얼굴이 새겨진 파스텔 큐브, 여섯 맛이 한 봉지에 든다
  { seedKey: "하리보-스퀴시", name: "스퀴시", brand: "하리보", shape: "cube", color: "berry" },
  { seedKey: "오리온-마이구미-포도", name: "마이구미 포도", brand: "오리온", shape: "cube", color: "grape" },
  { seedKey: "오리온-마이구미-딸기", name: "마이구미 딸기", brand: "오리온", shape: "heart", color: "berry" },
  { seedKey: "오리온-마이구미-청포도", name: "마이구미 청포도", brand: "오리온", shape: "cube", color: "green" },
  { seedKey: "오리온-왕꿈틀이", name: "왕꿈틀이", brand: "오리온", shape: "worm", color: "berry" },
  { seedKey: "오리온-포도알맹이젤리", name: "포도알맹이젤리", brand: "오리온", shape: "ring", color: "grape" },
  { seedKey: "오리온-리찌알맹이젤리", name: "리찌알맹이젤리", brand: "오리온", shape: "ring", color: "soda" },
  { seedKey: "롯데-젤리뽀", name: "젤리뽀 청포도", brand: "롯데", shape: "cube", color: "green" },
  { seedKey: "롯데-색고드름젤리", name: "색고드름젤리", brand: "롯데", shape: "worm", color: "soda" },
  { seedKey: "트롤리-콜라보틀", name: "콜라보틀", brand: "트롤리", shape: "bottle", color: "cola" },
  { seedKey: "트롤리-지구젤리", name: "지구젤리", brand: "트롤리", shape: "ring", color: "soda" },
  { seedKey: "트롤리-복숭아링", name: "복숭아링", brand: "트롤리", shape: "ring", color: "peach" },
  { seedKey: "트롤리-게코젤리", name: "게코젤리", brand: "트롤리", shape: "worm", color: "green" },
  { seedKey: "트롤리-사우어-게코젤리", name: "사우어 게코젤리", brand: "트롤리", shape: "worm", color: "green" },
  { seedKey: "트롤리-상어젤리", name: "상어젤리", brand: "트롤리", shape: "worm", color: "soda" },
  // 겉에 설탕을 묻힌 연두·분홍 알맹이. 봉지에는 「애플향 팝스」로 적혀 있다
  { seedKey: "트롤리-애플팝스", name: "애플팝스", brand: "트롤리", shape: "ring", color: "green" },
  { seedKey: "uha-코로로-포도", name: "코로로 포도", brand: "UHA", shape: "cube", color: "grape" },
  { seedKey: "uha-코로로-청포도", name: "코로로 청포도", brand: "UHA", shape: "cube", color: "green" },
  // 파스타 페투치네를 닮은 납작한 띠. 신맛 가루가 묻어 있다
  { seedKey: "부르봉-페투치네구미-포도", name: "페투치네구미 포도", brand: "부르봉", shape: "worm", color: "grape" },
  { seedKey: "스키틀즈-젤리-후르츠믹스", name: "젤리 후르츠믹스", brand: "스키틀즈", shape: "ring", color: "berry" },
  { seedKey: "스키틀즈-젤리-후르츠요거트", name: "젤리 후르츠요거트", brand: "스키틀즈", shape: "ring", color: "soda" },
  { seedKey: "네슬레-프루팁스-미니", name: "프루팁스 미니", brand: "네슬레", shape: "ring", color: "berry" },
  { seedKey: "히치스-수수깡-코리아에디션", name: "수수깡 코리아에디션", brand: "히치스", shape: "worm", color: "berry" },
  { seedKey: "탑-체리쉬-망고스틴젤리", name: "체리쉬 망고스틴젤리", brand: "탑", shape: "ring", color: "soda" },
  { seedKey: "해외-모구리치젤리", name: "모구리치젤리", brand: "해외", shape: "bottle", color: "soda" },
  { seedKey: "cj-쁘띠첼-과일젤리-밀감", name: "쁘띠첼 과일젤리 밀감", brand: "CJ", shape: "ring", color: "orange" },
  { seedKey: "cj-쁘띠첼-과일젤리-복숭아", name: "쁘띠첼 과일젤리 복숭아", brand: "CJ", shape: "heart", color: "peach" },
  { seedKey: "매일-피크닉젤리-사과", name: "피크닉젤리 사과", brand: "매일", shape: "cube", color: "green" },
  { seedKey: "매일-피크닉젤리-청포도", name: "피크닉젤리 청포도", brand: "매일", shape: "cube", color: "green" },
  { seedKey: "동아-박카스맛젤리", name: "박카스맛젤리", brand: "동아", shape: "bottle", color: "orange" },
  { seedKey: "동아-박카스-사워젤리", name: "박카스 사워젤리", brand: "동아", shape: "bottle", color: "orange" },
  { seedKey: "서주-요구르트젤리", name: "요구르트젤리", brand: "서주", shape: "bottle", color: "soda" },
  { seedKey: "서주-마로마로젤리", name: "마로마로젤리", brand: "서주", shape: "ring", color: "cola" },
  { seedKey: "서주-칸탈로프메론젤리", name: "칸탈로프메론젤리", brand: "서주", shape: "cube", color: "orange" },
  { seedKey: "mds-젤리블리-코코포도", name: "젤리블리 코코포도", brand: "MDS", shape: "ring", color: "grape" },
  { seedKey: "mds-젤리블리-코코리치", name: "젤리블리 코코리치", brand: "MDS", shape: "ring", color: "soda" },
  { seedKey: "에이스-샤인머스캣젤리", name: "샤인머스캣젤리", brand: "에이스", shape: "cube", color: "green" },
  { seedKey: "에이스-시트러스레몬젤리", name: "시트러스레몬젤리", brand: "에이스", shape: "cube", color: "lemon" },
  { seedKey: "에이블-3d-모듬초밥젤리", name: "3D 모듬초밥젤리", brand: "에이블", shape: "cube", color: "peach" },
  { seedKey: "에이블-스웨디시-요구르트향젤리", name: "스웨디시 요구르트향젤리", brand: "에이블", shape: "worm", color: "soda" },
  { seedKey: "유앤-스웨디시스타일젤리", name: "스웨디시스타일젤리", brand: "유앤", shape: "worm", color: "berry" },
  { seedKey: "유앤-킹웜크루젤리", name: "킹웜크루젤리", brand: "유앤", shape: "worm", color: "green" },
  { seedKey: "시원-무지개줄자젤리", name: "무지개줄자젤리", brand: "시원", shape: "worm", color: "berry" },
  { seedKey: "선우-otrisq-동결건조젤리", name: "O△□ 동결건조젤리", brand: "선우", shape: "cube", color: "berry" },
  { seedKey: "선우-동결건조-하트구미첼", name: "동결건조 하트구미첼", brand: "선우", shape: "heart", color: "berry" },
  { seedKey: "선우-얼려먹는젤리-1탄", name: "얼려먹는젤리 1탄", brand: "선우", shape: "cube", color: "soda" },
  { seedKey: "선우-얼려먹는젤리-2탄", name: "얼려먹는젤리 2탄", brand: "선우", shape: "cube", color: "berry" },
  { seedKey: "빙그레-곤약젤리-복숭아", name: "곤약젤리 복숭아", brand: "빙그레", shape: "heart", color: "peach" },
  { seedKey: "빙그레-곤약젤리-청포도", name: "곤약젤리 청포도", brand: "빙그레", shape: "cube", color: "green" },
  { seedKey: "미야오캣-곤약젤리-복숭아", name: "곤약젤리 복숭아", brand: "미야오캣", shape: "heart", color: "peach" },
  { seedKey: "미야오캣-곤약젤리-포도", name: "곤약젤리 포도", brand: "미야오캣", shape: "ring", color: "grape" },
  { seedKey: "슈가로로-곤약젤리-복숭아", name: "곤약젤리 복숭아", brand: "슈가로로", shape: "heart", color: "peach" },
  { seedKey: "슈가로로-곤약젤리-망고", name: "곤약젤리 망고", brand: "슈가로로", shape: "ring", color: "orange" },
  { seedKey: "슈가로로-곤약젤리-리치", name: "곤약젤리 리치", brand: "슈가로로", shape: "cube", color: "soda" },
  { seedKey: "슈가로로-곤약젤리-딸기and키위", name: "곤약젤리 딸기&키위", brand: "슈가로로", shape: "heart", color: "berry" },
  { seedKey: "슈가로로-곤약젤리-골드키위and파인", name: "곤약젤리 골드키위&파인", brand: "슈가로로", shape: "ring", color: "lemon" },
  { seedKey: "자임-콜라겐젤리-복숭아", name: "콜라겐젤리 복숭아", brand: "자임", shape: "heart", color: "peach" },
  { seedKey: "자임-콜라겐젤리-청포도", name: "콜라겐젤리 청포도", brand: "자임", shape: "cube", color: "green" },
  { seedKey: "자임-콜라겐젤리-애사비", name: "콜라겐젤리 애사비", brand: "자임", shape: "cube", color: "cola" },
  { seedKey: "티젠-콤부차-콜라겐젤리-피치", name: "콤부차 콜라겐젤리 피치", brand: "티젠", shape: "heart", color: "peach" },
  { seedKey: "종근당건강-아임비타-비타민젤리", name: "아임비타 비타민젤리", brand: "종근당건강", shape: "ring", color: "orange" },
  { seedKey: "세븐일레븐-밀양딸기젤리", name: "밀양딸기젤리", brand: "세븐일레븐", shape: "heart", color: "berry" },
  { seedKey: "세븐일레븐-제주감귤젤리", name: "제주감귤젤리", brand: "세븐일레븐", shape: "ring", color: "orange" },
  { seedKey: "세븐일레븐-젤리초코볼-샤인머스켓", name: "젤리초코볼 샤인머스켓", brand: "세븐일레븐", shape: "ring", color: "green" },
  { seedKey: "세븐일레븐-젤리초코볼-오렌지", name: "젤리초코볼 오렌지", brand: "세븐일레븐", shape: "ring", color: "orange" },
  { seedKey: "코아-캐치티니핑-워터젤리-복숭아", name: "캐치티니핑 워터젤리 복숭아", brand: "코아", shape: "bottle", color: "peach" },
];
