import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { syncSeed } from "./data/db";
import { watchInstallPrompt } from "./lib/install";
import { watchForUpdates } from "./lib/updates";
import "./styles/app.css";

// 설치하자마자 검색이 되도록 도감 씨앗을 깔아둔다 (첫 실행 한 번만)
syncSeed().catch((err) => console.error("씨앗 깔기 실패", err));

// 설치 신호는 앱이 뜨자마자 한 번 날아온다. 설정 화면에서 듣기 시작하면 이미 늦다.
watchInstallPrompt();

// 새로 배포한 게 폰에 보이려면 앱을 두 번 열어야 했다. 알아서 갈아끼운다.
watchForUpdates();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
