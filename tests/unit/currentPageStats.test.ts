import { afterEach, describe, expect, it, vi } from "vitest";

describe("getCurrentPageStats", () => {
  afterEach(() => {
    vi.resetModules();
    delete (globalThis as Record<string, unknown>).chrome;
    delete (globalThis as Record<string, unknown>).browser;
  });

  it("counts only matched blocking rulesets in the total", async () => {
    (globalThis as Record<string, unknown>).chrome = {
      declarativeNetRequest: {
        getMatchedRules: vi.fn().mockResolvedValue({
          rulesMatchedInfo: [
            { rule: { rulesetId: "ads" } },
            { rule: { rulesetId: "trackers" } },
            { rule: { rulesetId: "dynamic-allowlist" } }
          ]
        })
      }
    };

    const { getCurrentPageStats } = await import("../../src/background/currentPageStats");
    const stats = await getCurrentPageStats(7);

    expect(stats.total).toBe(2);
    expect(stats.byCategory.ads).toBe(1);
    expect(stats.byCategory.trackers).toBe(1);
    expect(stats.byCategory.annoyances).toBe(0);
  });

  it("returns null totals when matched-rule access is unavailable", async () => {
    (globalThis as Record<string, unknown>).chrome = {
      declarativeNetRequest: {}
    };

    const { getCurrentPageStats } = await import("../../src/background/currentPageStats");
    const stats = await getCurrentPageStats(7);

    expect(stats.total).toBeNull();
    expect(stats.byCategory.ads).toBe(0);
  });
});
