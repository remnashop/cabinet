import { describe, expect, it } from "vitest";

import { inviteLinks } from "./links";

describe("inviteLinks", () => {
  it("builds the bot and cabinet links", () => {
    expect(inviteLinks("IVAN42", "shop_bot", "https://c.example")).toEqual({
      bot: "https://t.me/shop_bot?start=ref_IVAN42",
      cabinet: "https://c.example/?ref=IVAN42",
    });
  });

  it("has no bot link without a bot username", () => {
    expect(inviteLinks("IVAN42", null, "https://c.example").bot).toBeNull();
  });

  it("has no links without a code", () => {
    expect(inviteLinks(null, "shop_bot", "https://c.example")).toEqual({ bot: null, cabinet: null });
  });
});
