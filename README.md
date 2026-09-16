# 젤리젤리 🫙

먹은 젤리를 병에 담아 모으는 개인 기록 앱.
독서기록 앱 *북적북적*이 책을 쌓아 올리듯, 젤리를 쌓아 올린다.

혼자 쓰려고 만드는 앱이라 기록과 사진은 전부 기기 안(IndexedDB)에 저장된다.

## 지금 상태 — MVP 완성

| 화면 | 하는 일 |
|---|---|
| 보관함 (홈) | 달 단위 유리병, 먹는 중 목록, 앞뒤 달 이동 |
| 기록하기 | 초성 검색으로 찾아 한 번 탭 |
| 젤리 추가/수정 | 이름만 필수. 사진·모양·색 |
| 다 먹었어요 | 별점 + 식감 슬라이더 3종 + 한 줄, 그리고 병에 떨어지는 연출 |
| 젤리 상세 | 먹은 횟수, 평균 별점, 식감 평균, 기록 타임라인 |
| 달력 | 날짜별 젤리 색 점, 날짜를 누르면 그날 기록 |
| 도감 | 모은 종류 수, 카드 그리드, 검색 |
| 설정 | 백업 내보내기·복원, 전체 삭제 |

아직 안 한 것: 서버 동기화(Supabase), 추천 탭, 위시리스트, 월간 리포트 카드,
바코드 스캔, 자동 누끼.

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
  styles/tokens.css        디자인 토큰 - 젤리 8색, 액센트, 폰트
  styles/app.css           Tailwind + 유리병 + 식감 슬라이더 CSS
  data/types.ts            Jelly(카탈로그) / Entry(먹은 기록)
  data/db.ts               Dexie 스키마와 쓰기 함수
  data/seed.ts             첫 실행 때 깔리는 편의점 젤리 12종
  lib/pile.ts              병에 젤리가 쌓이는 배치 알고리즘
  lib/search.ts            초성 검색
  lib/photo.ts             사진 압축(640px WebP)과 URL 수명 관리
  lib/backup.ts            내보내기 / 되살리기
  components/Jelly.tsx     알맹이 6종(곰·벌레·링·큐브·하트·콜라병) + 봉지
  components/Jar.tsx       유리병
  screens/                 화면 여덟 개
```

**Jelly와 Entry는 분리한다.** 같은 젤리를 열 번 먹어도 카탈로그는 하나고,
먹은 사건이 열 개 쌓인다.

**병 안은 항상 SVG 알맹이다.** 봉지 사진 서른 장이 겹쳐 쌓이면 병이 아니라
잡동사니가 된다. 사진은 목록·도감·상세 카드에 들어가고, 없으면 모양+색이 대신한다.

**백업은 타협 대상이 아니다.** 서버가 없으니 이 세상에 내 기록은 폰 안의 사본
하나뿐이다. 설정에서 기록과 사진을 파일 하나로 내려받을 수 있고, 되살릴 때는
지금 기기에 있는 것을 지우지 않고 합친다.

## 문서

- [`docs/plan.html`](docs/plan.html) — 타당성 검토와 기획안
- [`docs/ui.html`](docs/ui.html) — UI 시안
