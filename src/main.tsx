import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { syncSeed } from "./data/db";
import "./styles/app.css";

// 설치하자마자 검색이 되도록 도감 씨앗을 깔아둔다 (첫 실행 한 번만)
syncSeed().catch((err) => console.error("씨앗 깔기 실패", err));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
