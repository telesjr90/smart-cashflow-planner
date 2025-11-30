// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192.png", "pwa-512.png"],
      // We ship our own manifest.json inside /public
      manifest: false,
    }),
  ],
  base: "/",          // ✅ Matches Firebase Hosting path resolution
  build: {
    outDir: "dist",    // ✅ Matches firebase.json "public": "dist"
    sourcemap: true,   // (Optional) helpful for debugging
  },
});
