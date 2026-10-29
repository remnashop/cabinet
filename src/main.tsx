import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@app/App";
import { queryClient } from "@app/query-client";
import { ShaderBackground } from "@app/ShaderBackground";
import { ApplyAppearance } from "@entities/appearance/ApplyAppearance";
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
  initTelegram(CANVAS_COLOR);
  captureAttribution(window.location.search, getStartParam());

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ShaderBackground />
        <ApplyAppearance />
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
