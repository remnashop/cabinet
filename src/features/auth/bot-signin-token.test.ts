import { expect, it } from "vitest";

import { readBotSignInToken } from "@features/auth/bot-signin-token";

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
