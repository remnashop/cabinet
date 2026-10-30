import { expect, it } from "vitest";

import { isStaleChunkError } from "./stale-chunk";

it("tells a stale chunk from any other error", () => {
  expect(isStaleChunkError(new TypeError("Failed to fetch dynamically imported module: /assets/x.js"))).toBe(true);
  expect(isStaleChunkError(new TypeError("Importing a module script failed."))).toBe(true);
  expect(isStaleChunkError(new Error("Cannot read properties of undefined"))).toBe(false);
  expect(isStaleChunkError("boom")).toBe(false);
});
