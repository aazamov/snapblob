import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  resolve: {
    alias: {
      "@ffmpeg/ffmpeg": path.resolve(__dirname, "node_modules/@ffmpeg/ffmpeg"),
      "@ffmpeg/util": path.resolve(__dirname, "node_modules/@ffmpeg/util"),
      pica: path.resolve(__dirname, "node_modules/pica"),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    fs: {
      allow: [".."],
    },
  },
  plugins: [react()],
});
