import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { PlanDescription } from "./PlanDescription";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const host = document.createElement("div");
const root = createRoot(host);

afterEach(() => act(() => root.render(null)));

describe("PlanDescription", () => {
  it("draws premium emoji as thumbnails between the text, then the glyph when one fails to load", () => {
    act(() => root.render(<PlanDescription markup="[🔥](emoji:42) fast [⭐](emoji:7)!" />));
    const images = host.querySelectorAll("img");
    expect([...images].map((img) => img.getAttribute("src"))).toEqual([
      "/api/emoji-packs/thumbnails/42",
      "/api/emoji-packs/thumbnails/7",
    ]);
    expect(host.textContent).toBe(" fast !");

    act(() => images[0].dispatchEvent(new Event("error")));
    expect(host.textContent).toBe("🔥 fast !");
  });

  it("leaves plain text and brackets that aren't markup as they are", () => {
    act(() => root.render(<PlanDescription markup="[note](link) 5 GB" />));
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toBe("[note](link) 5 GB");
  });
});
