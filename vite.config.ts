import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // 설명서는 앱이 아니다. 오프라인 캐시에 2MB 짜리 캡처를 밀어 넣을 이유가 없다.
        globIgnores: ["**/manual/**"],
        // 서비스 워커는 이 주소의 모든 화면 이동을 앱 껍데기로 바꿔치기한다.
        // 그래서 폰에서 /manual/ 을 열면 설명서 대신 앱이 떴다. 서버는 멀쩡해서
        // 브라우저 밖에서는 멀쩡히 보이는 게 함정이다. 설명서만 빼준다.
        navigateFallbackDenylist: [/^\/manual(\/|$)/],
      },
      includeAssets: ["icon-180.png"],
      manifest: {
        name: "젤리젤리",
        short_name: "젤리젤리",
        description: "먹은 젤리를 병에 담아 모으는 기록장",
        lang: "ko",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#FBF4F5",
        theme_color: "#FBF4F5",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          // 마스커블은 OS 가 원형으로 깎아도 병이 안 잘리게 따로 그린 것
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: { host: true },
});
