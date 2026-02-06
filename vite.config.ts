/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
  },
  plugins: [
    VitePWA({
      strategies: "injectManifest", // Используем кастомный SW
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false, // Регистрируем вручную в pwa.ts
      includeAssets: ["icons/*.png"],
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: "Ð¦ÐµÐ½Ð°Ð—Ð°1 â€” ÐšÐ°Ð»ÑŒÐºÑƒÐ»ÑÑ‚Ð¾Ñ€ Ñ†ÐµÐ½Ñ‹ Ð·Ð° ÐµÐ´Ð¸Ð½Ð¸Ñ†Ñƒ",
        short_name: "Ð¦ÐµÐ½Ð°Ð—Ð°1",
        description:
          "Ð¡Ñ€Ð°Ð²Ð½Ð¸Ð²Ð°Ð¹Ñ‚Ðµ Ñ†ÐµÐ½Ñ‹ Ñ‚Ð¾Ð²Ð°Ñ€Ð¾Ð² Ð·Ð° ÐµÐ´Ð¸Ð½Ð¸Ñ†Ñƒ Ð¸Ð·Ð¼ÐµÑ€ÐµÐ½Ð¸Ñ Ð¸ Ð½Ð°Ñ…Ð¾Ð´Ð¸Ñ‚Ðµ Ð»ÑƒÑ‡ÑˆÐ¸Ðµ Ð¿Ñ€ÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#0a0a0f",
        theme_color: "#0a0a0f",
        orientation: "portrait",
        lang: "ru",
        categories: ["shopping", "utilities", "finance"],
        icons: [
          {
            src: "icons/icon-72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
