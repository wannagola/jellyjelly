import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { TabBar } from "./components/TabBar";
import { CalendarScreen } from "./screens/CalendarScreen";
import { DexScreen } from "./screens/DexScreen";
import { DrawScreen } from "./screens/DrawScreen";
import { FinishScreen } from "./screens/FinishScreen";
import { JarShelfScreen } from "./screens/JarShelfScreen";
import { JellyDetailScreen } from "./screens/JellyDetailScreen";
import { JellyFormScreen } from "./screens/JellyFormScreen";
import { RecommendScreen } from "./screens/RecommendScreen";
import { RecordScreen } from "./screens/RecordScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ShelfScreen } from "./screens/ShelfScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { useSettings } from "./lib/settings";
import { applyTheme } from "./lib/theme";
import { useAutoSync } from "./lib/useAutoSync";

/** 탭바를 숨기는 화면들 — 하나의 일을 끝내고 돌아가는 곳이라 */
const FULLSCREEN = [/^\/record/, /^\/finish\//, /^\/jelly\/[^/]+\/edit/, /^\/draw/];

export default function App() {
  const { pathname } = useLocation();
  const bare = FULLSCREEN.some((re) => re.test(pathname));
  const settings = useSettings();
  useAutoSync();

  useEffect(() => {
    if (settings) applyTheme(settings.theme);
  }, [settings]);

  // 설정을 아직 못 읽었을 땐 아무것도 그리지 않는다.
  // 여기서 성급하게 그리면 첫 화면에 닉네임 입력창이 번쩍 스친다.
  if (!settings) return null;
  if (!settings.nickname) return <WelcomeScreen />;

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-bg">
      <Routes>
        {/* 홈은 선반이다. 달 하나짜리 병은 그 아래로 들어간다. */}
        <Route path="/" element={<JarShelfScreen />} />
        <Route path="/month/:key" element={<ShelfScreen />} />
        <Route path="/record" element={<RecordScreen />} />
        <Route path="/record/new" element={<JellyFormScreen mode="create" />} />
        <Route path="/finish/:id" element={<FinishScreen />} />
        <Route path="/jelly/:id" element={<JellyDetailScreen />} />
        <Route path="/jelly/:id/edit" element={<JellyFormScreen mode="edit" />} />
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="/dex" element={<DexScreen />} />
        <Route path="/recommend" element={<RecommendScreen />} />
        <Route path="/draw" element={<DrawScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      {bare ? null : <TabBar />}
    </div>
  );
}
