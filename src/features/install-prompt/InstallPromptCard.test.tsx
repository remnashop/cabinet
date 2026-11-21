import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@shared/i18n";

import { InstallPromptCard } from "./InstallPromptCard";

const telegram = vi.hoisted(() => ({ isMiniApp: vi.fn(() => false), useTelegramBackButton: vi.fn() }));
vi.mock("@shared/telegram", () => telegram);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;
let standalone = false;

async function render() {
  await act(async () => root.render(<InstallPromptCard key={Math.random()} />));
}
const byText = (text: string) => [...document.querySelectorAll("button")].find((b) => b.textContent === text)!;
const userAgent = (ua: string) => vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);

beforeEach(async () => {
  await i18n.changeLanguage("en");
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  standalone = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: standalone && query.includes("standalone"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  telegram.isMiniApp.mockReturnValue(false);
  userAgent(IPHONE);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("InstallPromptCard", () => {
  it("shows the guide for the phone's browser, then never asks this browser again", async () => {
    await render();
    await act(async () => byText("Add").click());
    expect(document.body.textContent).toContain("Add to Home Screen");
    await act(async () => byText("Got it").click());
    await render();
    expect(container.innerHTML).toBe("");
  });

  it("gives Android its own steps", async () => {
    userAgent(ANDROID);
    await render();
    await act(async () => byText("Add").click());
    expect(document.body.textContent).toContain("Install app");
  });

  it("goes away for good on Not now", async () => {
    await render();
    await act(async () => byText("Not now").click());
    expect(container.innerHTML).toBe("");
    await render();
    expect(container.innerHTML).toBe("");
  });

  it("stays away in the Mini App, once installed and on a desktop", async () => {
    telegram.isMiniApp.mockReturnValue(true);
    await render();
    expect(container.innerHTML).toBe("");

    telegram.isMiniApp.mockReturnValue(false);
    standalone = true;
    await render();
    expect(container.innerHTML).toBe("");

    standalone = false;
    userAgent(DESKTOP);
    await render();
    expect(container.innerHTML).toBe("");
  });
});
