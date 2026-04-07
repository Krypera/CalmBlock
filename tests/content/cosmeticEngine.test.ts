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

  it("keeps single style tag across repeated apply calls", () => {
    loadFixture("cosmetic-rich.html");
    const engine = new CosmeticEngine();
    engine.apply();
    engine.apply();
    const styles = document.querySelectorAll("#calmblock-cosmetic-style");
    expect(styles.length).toBe(1);
    const styleText = styles[0]?.textContent ?? "";
    expect(styleText).toContain("iframe[src*='doubleclick']");
    expect(styleText).toContain("[class*='cookie-banner']");
  });

  it("clear is safe to call repeatedly", () => {
    loadFixture("cosmetic-rich.html");
    const engine = new CosmeticEngine();
    engine.apply();
    engine.clear();
    engine.clear();
    expect(document.querySelector("#calmblock-cosmetic-style")).toBeNull();
  });
});
