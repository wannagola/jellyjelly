# 젤리젤리 🫙

먹은 젤리를 병에 담아 모으는 개인 기록 앱.
독서기록 앱 *북적북적*이 책을 쌓아 올리듯, 젤리를 쌓아 올린다.

혼자 쓰려고 만드는 앱이라 기록과 사진은 전부 기기 안(IndexedDB)에 저장된다.

## 지금 상태 — Day 1

| 화면 | 상태 |
|---|---|
| 보관함 (홈) | 유리병 + 젤리 더미 렌더링 |
| 기록하기 | Day 2 |
| 달력 | Day 4 |
| 도감 | Day 4 |
| 설정 (백업·로그인) | Day 2.5 |

## 실행

```bash
npm install
npm run dev
```

폰에서 보려면 맥과 같은 와이파이에서 터미널에 찍히는 Network 주소로 접속한 뒤,
**홈 화면에 추가**해서 쓴다. (Safari는 7일간 방문 없는 사이트의 저장소를 지우는데,
홈 화면에 추가한 웹앱은 이 규칙에서 제외된다.)

```bash
npm run build    # 타입체크 + 빌드
npm run lint     # oxlint
```

## 기술

React 19 · TypeScript · Vite · Tailwind v4 · Motion · Dexie(IndexedDB) ·
React Router · es-hangul(초성 검색) · date-fns · vite-plugin-pwa

의도적으로 안 쓰는 것: Next.js, 상태관리 라이브러리(`useLiveQuery`가 대신한다),
UI 컴포넌트 라이브러리(이 앱의 전부가 커스텀 귀여움이라), ORM.

## 구조

```
src/
  styles/tokens.css        디자인 토큰 — 젤리 8색, 액센트, 폰트
  styles/app.css           Tailwind + 유리병 CSS
  data/types.ts            Jelly(카탈로그) / Entry(먹은 기록)
  lib/jelly.ts             색·모양 상수
  lib/pile.ts              병에 젤리가 쌓이는 배치 알고리즘
  components/Jelly.tsx     알맹이 6종(곰·벌레·링·큐브·하트·콜라병) + 봉지
  components/Jar.tsx       유리병
  components/TabBar.tsx    탭 4개 + 중앙 기록 버튼
  screens/                 화면
```

**Jelly와 Entry는 분리한다.** 같은 젤리를 열 번 먹어도 카탈로그는 하나고,
먹은 사건이 열 개 쌓인다.

**병 안은 항상 SVG 알맹이다.** 봉지 사진 서른 장이 겹쳐 쌓이면 병이 아니라
잡동사니가 된다. 사진은 목록·도감·상세 카드에 들어가고, 없으면 모양+색이 대신한다.

## 문서

- [`docs/plan.html`](docs/plan.html) — 타당성 검토와 기획안
- [`docs/ui.html`](docs/ui.html) — UI 시안
