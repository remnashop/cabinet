import { beforeEach, describe, expect, it } from "vitest";

import {
  clearStashedBotLinkToken,
  readBotSignInToken,
  readStashedBotLinkToken,
  stashBotLinkToken,
} from "@features/auth/bot-signin-token";

it("reads a token_urlsafe(32) token", () => {
  const token = "Ab3_-".repeat(9).slice(0, 43);
  expect(readBotSignInToken(`#token=${token}`)).toBe(token);
});

it("ignores a missing or malformed token", () => {
  expect(readBotSignInToken("")).toBeNull();
  expect(readBotSignInToken("#token=short")).toBeNull();
  expect(readBotSignInToken(`#token=${"a".repeat(129)}`)).toBeNull();
  expect(readBotSignInToken("#token=%3Cscript%3E".padEnd(40, "a"))).toBeNull();
});

describe("the /link/bot token stashed across sign-in", () => {
  const token = "Ab3_-".repeat(9).slice(0, 43);
  beforeEach(() => sessionStorage.clear());

  it("is kept from the hash until cleared", () => {
    stashBotLinkToken(`#token=${token}`);
    expect(readStashedBotLinkToken()).toBe(token);
    clearStashedBotLinkToken();
    expect(readStashedBotLinkToken()).toBeNull();
  });

  it("expires after 5 minutes", () => {
    stashBotLinkToken(`#token=${token}`);
    expect(readStashedBotLinkToken(Date.now() + 4 * 60_000)).toBe(token);
    expect(readStashedBotLinkToken(Date.now() + 5 * 60_000)).toBeNull();
  });

  it("stores nothing for a missing or malformed token, ignores a damaged entry", () => {
    stashBotLinkToken("#token=short");
    expect(readStashedBotLinkToken()).toBeNull();
    sessionStorage.setItem("cabinet_link_bot_token", "{broken");
    expect(readStashedBotLinkToken()).toBeNull();
  });
});
