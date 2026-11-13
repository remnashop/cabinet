import { describe, expect, it } from "vitest";

import type { Identity } from "@entities/identity/api";
import type { AuthMethods } from "@features/auth/api";

import { rowAction, visibleIdentities } from "./identity-rows";

const items: Identity[] = [
  { kind: "TELEGRAM", linked: true, label: "@dev", editable: true },
  { kind: "EMAIL", linked: false, label: null, editable: true },
  { kind: "GOOGLE", linked: false, label: null, editable: true },
  { kind: "YANDEX", linked: true, label: "a@ya.ru", editable: true },
];
const methods = (over: Partial<AuthMethods>): AuthMethods => ({
  telegram_webapp: false,
  telegram_deeplink: false,
  email: false,
  oauth: [],
  allowed_email_domains: null,
  captcha: null,
  bot_username: null,
  ...over,
});
const kinds = (m: AuthMethods) => visibleIdentities(items, m).map((i) => i.kind);

describe("visibleIdentities", () => {
  it("hides unlinked methods that are switched off, keeps linked ones", () => {
    expect(kinds(methods({}))).toEqual(["TELEGRAM", "YANDEX"]);
  });
  it("shows unlinked methods that are enabled", () => {
    expect(kinds(methods({ email: true, oauth: ["google"] }))).toEqual(["TELEGRAM", "EMAIL", "GOOGLE", "YANDEX"]);
  });
});

describe("rowAction", () => {
  const row = (kind: Identity["kind"], linked: boolean): Identity => ({ kind, linked, label: linked ? "x" : null, editable: true });

  it("offers unlink and connect in a browser", () => {
    for (const kind of ["TELEGRAM", "EMAIL", "GOOGLE", "YANDEX"] as const) {
      expect(rowAction(row(kind, true), false)).toBe("unlink");
      expect(rowAction(row(kind, false), false)).toBe("connect");
    }
  });

  it("never unlinks Telegram inside the Mini App: the next initData re-auth would register a new account", () => {
    expect(rowAction(row("TELEGRAM", true), true)).toBe("unlinkInBrowser");
    expect(rowAction(row("TELEGRAM", false), true)).toBeNull();
  });

  it("sends Google and Yandex linking to a browser inside the Mini App", () => {
    expect(rowAction(row("GOOGLE", false), true)).toBe("connectInBrowser");
    expect(rowAction(row("YANDEX", false), true)).toBe("connectInBrowser");
    expect(rowAction(row("GOOGLE", true), true)).toBe("unlink");
    expect(rowAction(row("EMAIL", false), true)).toBe("connect");
    expect(rowAction(row("EMAIL", true), true)).toBe("unlink");
  });

  it("offers nothing for the only linked method: the backend refuses to unlink it", () => {
    expect(rowAction(row("EMAIL", true), false, true)).toBe("onlyMethod");
    expect(rowAction(row("TELEGRAM", true), true, true)).toBe("onlyMethod");
    // an unlinked one can still be connected
    expect(rowAction(row("GOOGLE", false), false, true)).toBe("connect");
  });

  it("leaves staff's Telegram and email to the dashboard", () => {
    expect(rowAction({ ...row("EMAIL", true), editable: false }, false)).toBe("inDashboard");
    expect(rowAction({ ...row("TELEGRAM", false), editable: false }, true)).toBe("inDashboard");
  });
});
