import { Route, Routes, useLocation } from "react-router";
import { TabBar } from "./components/TabBar";
import { CalendarScreen } from "./screens/CalendarScreen";
import { DexScreen } from "./screens/DexScreen";
import { FinishScreen } from "./screens/FinishScreen";
import { JellyDetailScreen } from "./screens/JellyDetailScreen";
import { JellyFormScreen } from "./screens/JellyFormScreen";
import { RecordScreen } from "./screens/RecordScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ShelfScreen } from "./screens/ShelfScreen";

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
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="/dex" element={<DexScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      {bare ? null : <TabBar />}
    </div>
  );
}
