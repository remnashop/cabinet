import { expect, it } from "vitest";

import { pickSelected } from "@widgets/subscription-cards/select";

it("pickSelected keeps the previous id while it exists, else falls back to the first", () => {
  expect(pickSelected(2, [1, 2, 3])).toBe(2);
  expect(pickSelected(5, [1, 2])).toBe(1);
  expect(pickSelected(null, [])).toBeNull();
});
