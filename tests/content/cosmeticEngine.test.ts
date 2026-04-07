import { describe, expect, it } from "vitest";
import { CosmeticEngine } from "../../src/content/cosmeticEngine";
import { loadFixture } from "./fixtureHarness";

describe("CosmeticEngine", () => {
  it("injects and clears style tag", () => {
    loadFixture("cosmetic-basic.html");
    const engine = new CosmeticEngine();
    engine.apply();
    expect(document.querySelector("#calmblock-cosmetic-style")).not.toBeNull();
    const styleText = document.querySelector<HTMLStyleElement>("#calmblock-cosmetic-style")?.textContent ?? "";
    expect(styleText).toContain(".adsbox");
    expect(styleText).toContain("[id*='ad-slot']");
    engine.clear();
    expect(document.querySelector("#calmblock-cosmetic-style")).toBeNull();
  });
});
