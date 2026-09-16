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
