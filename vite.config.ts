import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Where `npm run dev` proxies /api. Default targets `make run-local`
  // (the core is published on 127.0.0.1:5000). Override with API_PROXY_TARGET
  // in .env to hit a remapped port or a remote instance.
  const apiTarget = env.API_PROXY_TARGET || "http://localhost:5000";

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    server: {
      port: 5173,
      host: true,
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          // Strip the cookie Domain so the browser stores the session cookie
          // for localhost in dev (the backend may set it for another host).
          cookieDomainRewrite: "",
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/tests/setup.ts"],
    },
  };
});
