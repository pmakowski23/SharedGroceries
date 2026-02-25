import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { aiDebugLogPlugin } from "./vite/aiDebugLogPlugin";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === "development" && aiDebugLogPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      workbox: {
        navigateFallbackDenylist: [/^\/convex\//],
      },
      manifest: {
        name: "Nourishly",
        short_name: "Nourishly",
        description: "Collaborative groceries and meal planning app",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#F4F1EA",
        background_color: "#F4F1EA",
        icons: [
          {
            src: "/nourishly-favicons/logo.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
