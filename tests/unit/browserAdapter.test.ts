import { describe, expect, it } from "vitest";
import { BrowserAdapter } from "../../src/shared/browserAdapter";

describe("BrowserAdapter.detectTarget", () => {
  it("detects firefox", () => {
    expect(BrowserAdapter.detectTarget("Mozilla Firefox/124.0")).toBe("firefox");
  });

  it("detects edge", () => {
    expect(BrowserAdapter.detectTarget("Mozilla Edg/122.0")).toBe("edge");
  });
});

