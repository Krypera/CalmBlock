import { describe, expect, it } from "vitest";
import { COSMETIC_SELECTORS } from "../../src/content/cosmeticEngine";

describe("cosmetic selector regression", () => {
  it("keeps key nuisance selectors present", () => {
    expect(COSMETIC_SELECTORS).toContain("[class*='cookie-banner']");
    expect(COSMETIC_SELECTORS).toContain(".adsbox");
  });
});

