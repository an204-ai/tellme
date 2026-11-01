import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");
  const proxy = { "/api": { target: env.API_INTERNAL_URL || "http://127.0.0.1:4000", changeOrigin: true } };
  return {
  envDir: "../..",
  publicDir: false,
  plugins: [react()],
  server: {
    host: "127.0.0.1", port: 3001, strictPort: true, proxy,
  },
  preview: { host: "127.0.0.1", port: 3001, strictPort: true, proxy },
  };
});
