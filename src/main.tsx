import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@app/App";
import { queryClient } from "@app/query-client";
import { ShaderBackground } from "@app/ShaderBackground";
import { ApplyAppearance } from "@entities/appearance/ApplyAppearance";
import { detectPlatform } from "@entities/connect-guide/lib";
import "@shared/i18n";
import { captureAttribution } from "@shared/lib/attribution";
import { getStartParam, initTelegram } from "@shared/telegram";

import "@app/styles.css";

const CANVAS_COLOR = "#111111"; // --color-canvas

async function start(): Promise<void> {
  // dev only: the import is dropped from production builds with the branch
  if (import.meta.env.DEV && import.meta.env.VITE_MOCKS === "1") {
    const { enableMocks } = await import("./mocks/browser");
    await enableMocks();
    const { DebugPanel } = await import("./mocks/DebugPanel");
    const host = document.body.appendChild(document.createElement("div"));
    createRoot(host).render(<DebugPanel />);
  }
  // iOS zooms in on a field under 16px as it takes focus; maximum-scale stops that, and iOS still lets a pinch zoom
  // (Android would lose it, so only here)
  if (detectPlatform(navigator.userAgent, navigator.maxTouchPoints) === "ios") {
    const viewport = document.querySelector('meta[name="viewport"]');
    viewport?.setAttribute("content", `${viewport.getAttribute("content")}, maximum-scale=1`);
  }
  initTelegram(CANVAS_COLOR);
  captureAttribution(window.location.search, getStartParam());

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {/* the OS's reduce-motion: motion keeps fades, drops movement (pages, popovers, pills, taps) */}
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <ShaderBackground />
          <ApplyAppearance />
          <App />
        </QueryClientProvider>
      </MotionConfig>
    </StrictMode>,
  );
}

void start();
