import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router";
import { TabBar } from "./components/TabBar";
import { AcornScreen } from "./screens/AcornScreen";
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
import { SPLASH_MS, SplashScreen } from "./screens/SplashScreen";
import { TummyScreen } from "./screens/TummyScreen";
import { WaxBallScreen } from "./screens/WaxBallScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { useSettings } from "./lib/settings";
import { applyTheme } from "./lib/theme";
import { useAutoSync } from "./lib/useAutoSync";

/** 탭바를 숨기는 화면들 — 하나의 일을 끝내고 돌아가는 곳이라 */
const FULLSCREEN = [
  /^\/record/,
  /^\/finish\//,
  /^\/jelly\/[^/]+\/edit/,
  /^\/draw/,
  /^\/waxball/,
  /^\/tummy/,
  /^\/acorn/,
];

export default function App() {
  const { pathname } = useLocation();
  const bare = FULLSCREEN.some((re) => re.test(pathname));
  const settings = useSettings();
  const [splash, setSplash] = useState(true);
  useAutoSync();

  useEffect(() => {
    if (settings) applyTheme(settings.theme);
  }, [settings]);

  useEffect(() => {
    const t = window.setTimeout(() => setSplash(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // 시작 화면은 앱 위에 덮는다. 3초 동안 아래에서 설정을 다 읽어두면
  // 걷혔을 때 곧바로 제 화면이 나온다. 순서대로 하면 3초를 기다린 다음
  // 또 깜빡이게 된다.
  const splashLayer = splash ? <SplashScreen onDone={() => setSplash(false)} /> : null;

  // 설정을 아직 못 읽었을 땐 아무것도 그리지 않는다.
  // 여기서 성급하게 그리면 첫 화면에 닉네임 입력창이 번쩍 스친다.
  if (!settings) return splashLayer;
  if (!settings.nickname)
    return (
      <>
        {splashLayer}
        <WelcomeScreen />
      </>
    );

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-bg">
      {splashLayer}
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
        <Route path="/waxball" element={<WaxBallScreen />} />
        <Route path="/tummy" element={<TummyScreen />} />
        <Route path="/acorn" element={<AcornScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      {bare ? null : <TabBar />}
    </div>
  );
}
