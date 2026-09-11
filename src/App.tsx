import { Route, Routes } from "react-router";
import { TabBar } from "./components/TabBar";
import { ShelfScreen } from "./screens/ShelfScreen";
import { Soon } from "./screens/Soon";

export default function App() {
  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-bg">
      <Routes>
        <Route path="/" element={<ShelfScreen />} />
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
              when="Day 2.5에 만듭니다"
              what="로그인과 백업 내보내기가 들어갈 자리입니다."
              shape="ring"
              color="green"
            />
          }
        />
        <Route
          path="/record"
          element={
            <Soon
              title="뭐 먹었어요?"
              when="Day 2에 만듭니다"
              what="초성으로 젤리를 찾고, 없으면 바로 추가합니다."
              shape="worm"
              color="berry"
            />
          }
        />
      </Routes>
      <TabBar />
    </div>
  );
}
