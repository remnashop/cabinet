import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@shared/i18n";

import { markPushPromptEligible } from "./push-prompt";
import { PushPromptCard } from "./PushPromptCard";

const push = vi.hoisted(() => ({ detectPushSupport: vi.fn(), enablePush: vi.fn() }));
vi.mock("@shared/lib/push", () => push);
const backend = vi.hoisted(() => ({ configured: true as boolean | undefined }));
vi.mock("@entities/notification/api", () => ({
  pushApi: { tag: "api" },
  usePushConfiguredQuery: (enabled: boolean) => ({ data: enabled ? backend.configured : undefined }),
}));
const telegram = vi.hoisted(() => ({ isMiniApp: vi.fn(() => false) }));
vi.mock("@shared/telegram", () => telegram);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;

async function render() {
  await act(async () => root.render(<PushPromptCard key={Math.random()} />));
}
const buttons = () => [...container.querySelectorAll("button")];
const byText = (text: string) => buttons().find((b) => b.textContent === text)!;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  localStorage.clear();
  sessionStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  push.detectPushSupport.mockReturnValue("ready");
  push.enablePush.mockResolvedValue("subscribed");
  telegram.isMiniApp.mockReturnValue(false);
  backend.configured = true;
  vi.stubGlobal("Notification", { permission: "default" });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PushPromptCard", () => {
  it("shows nothing without a recent purchase or trial", async () => {
    await render();
    expect(container.innerHTML).toBe("");
  });

  it("stays through a remount until answered, then never asks this browser again", async () => {
    markPushPromptEligible();
    await render();
    expect(container.textContent).toContain("Turn on notifications");
    // a reload or a page and back: still there, nobody answered yet
    await render();
    expect(container.textContent).toContain("Turn on notifications");
    await act(async () => byText("Not now").click());
    // another purchase later doesn't ask again
    markPushPromptEligible();
    await render();
    expect(container.innerHTML).toBe("");
  });

  it("goes away on Not now", async () => {
    markPushPromptEligible();
    await render();
    await act(async () => byText("Not now").click());
    expect(container.innerHTML).toBe("");
    expect(push.enablePush).not.toHaveBeenCalled();
  });

  it("turns push on from the tap and goes away; a failure stays to be read", async () => {
    markPushPromptEligible();
    await render();
    await act(async () => byText("Enable").click());
    expect(push.enablePush).toHaveBeenCalledWith({ tag: "api" });
    expect(container.innerHTML).toBe("");

    localStorage.clear();
    markPushPromptEligible();
    push.enablePush.mockResolvedValue("failed");
    await render();
    await act(async () => byText("Enable").click());
    expect(container.textContent).toContain("Couldn't turn notifications on");
  });

  it("stays away when push can't be offered here", async () => {
    markPushPromptEligible();
    backend.configured = false;
    await render();
    expect(container.innerHTML).toBe("");

    backend.configured = true;
    vi.stubGlobal("Notification", { permission: "denied" });
    await render();
    expect(container.innerHTML).toBe("");

    vi.stubGlobal("Notification", { permission: "default" });
    telegram.isMiniApp.mockReturnValue(true);
    await render();
    expect(container.innerHTML).toBe("");

    telegram.isMiniApp.mockReturnValue(false);
    push.detectPushSupport.mockReturnValue("ios-needs-install");
    await render();
    expect(container.innerHTML).toBe("");
  });

  it("forgets a mark older than 30 minutes", async () => {
    markPushPromptEligible(Date.now() - 31 * 60 * 1000);
    await render();
    expect(container.innerHTML).toBe("");
  });
});
