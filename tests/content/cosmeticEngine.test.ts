import { describe, expect, it } from "vitest";
import { CosmeticEngine } from "../../src/content/cosmeticEngine";

describe("CosmeticEngine", () => {
  it("injects and clears style tag", () => {
    const engine = new CosmeticEngine();
    engine.apply();
    expect(document.querySelector("#calmblock-cosmetic-style")).not.toBeNull();
    engine.clear();
    expect(document.querySelector("#calmblock-cosmetic-style")).toBeNull();
  });
});
