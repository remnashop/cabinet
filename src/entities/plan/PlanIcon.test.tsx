import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { PlanIcon } from "./PlanIcon";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const host = document.createElement("div");
const root = createRoot(host);

afterEach(() => act(() => root.render(null)));

describe("PlanIcon", () => {
  it("shows the fallback when the plan has no emoji", () => {
    act(() => root.render(<PlanIcon id={null} glyph={null} className="size-4" fallback={<i data-fallback />} />));
    expect(host.querySelector("[data-fallback]")).not.toBeNull();
  });

  it("draws the pack thumbnail, then the glyph when it fails to load", () => {
    act(() => root.render(<PlanIcon id="123" glyph="⭐" className="size-4" fallback={<i data-fallback />} />));
    const img = host.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/api/emoji-packs/thumbnails/123");

    act(() => img.dispatchEvent(new Event("error")));
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toBe("⭐");
  });
});
