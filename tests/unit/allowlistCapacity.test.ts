import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("allowlist capacity profiles", () => {
  it("falls back to conservative capacity when DNR capability is unavailable", async () => {
    vi.stubGlobal("browser", {
      runtime: { getURL: vi.fn().mockReturnValue("moz-extension://id/") }
    });
    vi.stubGlobal("chrome", undefined);

    const mod = await import("../../src/shared/dnrAllowlist");
    const capacity = mod.resolveAllowlistHostCapacity();
    expect(capacity.maxHosts).toBe(mod.MAX_ALLOWLIST_HOSTS);
    expect(capacity.source).toBe("capability-unavailable");
  });

  it("uses firefox profile when moz-extension scheme is detected", async () => {
    vi.stubGlobal("browser", {
      runtime: { getURL: vi.fn().mockReturnValue("moz-extension://id/") },
      declarativeNetRequest: {
        getDynamicRules: vi.fn(),
        updateDynamicRules: vi.fn()
      }
    });
    vi.stubGlobal("chrome", undefined);

    const mod = await import("../../src/shared/dnrAllowlist");
    const capacity = mod.resolveAllowlistHostCapacity();
    expect(capacity.maxHosts).toBe(mod.FIREFOX_ALLOWLIST_HOSTS);
    expect(capacity.source).toBe("firefox-conservative");
  });

  it("uses chromium profile when chrome-extension scheme is detected", async () => {
    vi.stubGlobal("browser", {
      runtime: { getURL: vi.fn().mockReturnValue("chrome-extension://id/") },
      declarativeNetRequest: {
        getDynamicRules: vi.fn(),
        updateDynamicRules: vi.fn()
      }
    });
    vi.stubGlobal("chrome", undefined);

    const mod = await import("../../src/shared/dnrAllowlist");
    const capacity = mod.resolveAllowlistHostCapacity();
    expect(capacity.maxHosts).toBe(mod.CHROMIUM_ALLOWLIST_HOSTS);
    expect(capacity.source).toBe("chromium-dynamic-rules");
  });
});
