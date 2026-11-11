import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@shared/i18n";

import { PushToggle } from "./PushToggle";

const push = vi.hoisted(() => ({
  detectPushSupport: vi.fn(),
  currentPushEndpoint: vi.fn(),
  enablePush: vi.fn(),
  disablePush: vi.fn(),
}));
vi.mock("@shared/lib/push", () => push);
const backend = vi.hoisted(() => ({ configured: true as boolean | undefined }));
vi.mock("@entities/notification/api", () => ({
  pushApi: { tag: "api" },
  usePushConfiguredQuery: () => ({ data: backend.configured }),
}));
const telegram = vi.hoisted(() => ({ isMiniApp: vi.fn(() => false) }));
vi.mock("@shared/telegram", () => telegram);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;
const permission = (value: string) => vi.stubGlobal("Notification", { permission: value });

async function render() {
  await act(async () => root.render(<PushToggle />));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}
const button = () => container.querySelector("button");

beforeEach(async () => {
  await i18n.changeLanguage("en");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  push.detectPushSupport.mockReturnValue("ready");
  push.currentPushEndpoint.mockResolvedValue(null);
  push.enablePush.mockResolvedValue("subscribed");
  push.disablePush.mockResolvedValue(undefined);
  telegram.isMiniApp.mockReturnValue(false);
  backend.configured = true;
  permission("default");
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PushToggle", () => {
  it("says it is unsupported, without a button", async () => {
    push.detectPushSupport.mockReturnValue("unsupported");
    await render();
    expect(container.textContent).toContain("Not supported in this browser");
    expect(button()).toBeNull();
  });

  it("asks iOS to add the site to the Home Screen", async () => {
    push.detectPushSupport.mockReturnValue("ios-needs-install");
    await render();
    expect(container.textContent).toContain("Home Screen");
    expect(button()).toBeNull();
  });

  it("points to the browser settings when permission is denied", async () => {
    permission("denied");
    await render();
    expect(container.textContent).toContain("browser settings");
    expect(button()).toBeNull();
  });

  it("says push is not configured when the server has no key", async () => {
    push.enablePush.mockResolvedValue("not-configured");
    await render();
    await act(async () => button()!.click());
    expect(container.textContent).toContain("not configured by the administrator");
  });

  it("turns on, then off with an opt-out", async () => {
    await render();
    expect(button()!.textContent).toBe("Enable");
    push.currentPushEndpoint.mockResolvedValue("https://push/1");
    permission("granted");
    await act(async () => button()!.click());
    expect(push.enablePush).toHaveBeenCalledOnce();
    expect(button()!.textContent).toBe("Disable");

    push.currentPushEndpoint.mockResolvedValue(null);
    await act(async () => button()!.click());
    expect(push.disablePush).toHaveBeenCalledWith({ tag: "api" }, { optOut: true });
    expect(button()!.textContent).toBe("Enable");
  });

  it("renders nothing when the backend has no VAPID key, or until that is known", async () => {
    backend.configured = false;
    await render();
    expect(container.innerHTML).toBe("");
    backend.configured = undefined;
    await render();
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing in the Mini App", async () => {
    telegram.isMiniApp.mockReturnValue(true);
    await render();
    expect(container.innerHTML).toBe("");
  });
});
