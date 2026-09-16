import { Route, Routes, useLocation } from "react-router";
import { TabBar } from "./components/TabBar";
import { FinishScreen } from "./screens/FinishScreen";
import { JellyDetailScreen } from "./screens/JellyDetailScreen";
import { JellyFormScreen } from "./screens/JellyFormScreen";
import { RecordScreen } from "./screens/RecordScreen";
import { ShelfScreen } from "./screens/ShelfScreen";
import { Soon } from "./screens/Soon";

/** 탭바를 숨기는 화면들 — 하나의 일을 끝내고 돌아가는 곳이라 */
const FULLSCREEN = [/^\/record/, /^\/finish\//, /^\/jelly\/[^/]+\/edit/];

export default function App() {
  const { pathname } = useLocation();
  const bare = FULLSCREEN.some((re) => re.test(pathname));

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-bg">
      <Routes>
        <Route path="/" element={<ShelfScreen />} />
        <Route path="/record" element={<RecordScreen />} />
        <Route path="/record/new" element={<JellyFormScreen mode="create" />} />
        <Route path="/finish/:id" element={<FinishScreen />} />
        <Route path="/jelly/:id" element={<JellyDetailScreen />} />
        <Route path="/jelly/:id/edit" element={<JellyFormScreen mode="edit" />} />
        <Route
          path="/calendar"
          element={
            <Soon
              title="달력"
              when="Day 4에 만듭니다"
              what="이번 달 먹은 기록이 날짜별 젤리 점으로 찍힙니다."
              shape="cube"
              color="soda"
            />
          }
        />
        <Route
          path="/dex"
          element={
            <Soon
              title="내 젤리 도감"
              when="Day 4에 만듭니다"
              what="먹어본 젤리가 카드로 쌓이고, 몇 번 먹었는지가 아래에 붙습니다."
              shape="bear"
              color="grape"
            />
          }
        />
        <Route
          path="/settings"
          element={
            <Soon
              title="설정"
              when="Day 4에 만듭니다"
              what="백업 내보내기와 복원이 들어갈 자리입니다."
              shape="ring"
              color="green"
            />
          }
        />
      </Routes>
      {bare ? null : <TabBar />}
    </div>
  );
}
