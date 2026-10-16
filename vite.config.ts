import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const layer = (name: string) => fileURLToPath(new URL(`./src/${name}`, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@app": layer("app"),
      "@pages": layer("pages"),
      "@widgets": layer("widgets"),
      "@features": layer("features"),
      "@entities": layer("entities"),
      "@shared": layer("shared"),
    },
  },
  server: {
    // a tunnel (Mini App testing) arrives under its own hostname
    allowedHosts: true,
    proxy: {
      "/api": {
        // 127.0.0.1, not localhost: on macOS "localhost" may hit AirPlay's port 5000 over ::1
        target: process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:5000",
        // same rewrite as nginx in the image: the browser only ever sees /api
        rewrite: (path) => path.replace(/^\/api/, "/api/v1"),
        // exact match, not a prefix: the backend scopes every refresh cookie to this one path
        cookiePathRewrite: { "/api/v1/auth": "/api/auth" },
        xfwd: true,
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});
