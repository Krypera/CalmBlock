import { afterEach, describe, expect, it, vi } from "vitest";

describe("getCurrentPageStats", () => {
  afterEach(() => {
    vi.resetModules();
    delete (globalThis as Record<string, unknown>).chrome;
    delete (globalThis as Record<string, unknown>).browser;
  });

  it("counts only matched blocking rulesets in the total", async () => {
    (globalThis as Record<string, unknown>).chrome = {
      permissions: {
        contains: vi.fn().mockResolvedValue(true)
      },
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
    expect(stats.liveStatsAvailable).toBe(true);
    expect(stats.byCategory.ads).toBe(1);
    expect(stats.byCategory.trackers).toBe(1);
    expect(stats.byCategory.annoyances).toBe(0);
  });

  it("returns unavailable stats when feedback permission is not granted", async () => {
    const getMatchedRules = vi.fn().mockResolvedValue({
      rulesMatchedInfo: [{ rule: { rulesetId: "ads" } }]
    });
    (globalThis as Record<string, unknown>).chrome = {
      permissions: {
        contains: vi.fn().mockResolvedValue(false)
      },
      declarativeNetRequest: {
        getMatchedRules
      }
    };

    const { getCurrentPageStats } = await import("../../src/background/currentPageStats");
    const stats = await getCurrentPageStats(7);

    expect(stats.total).toBeNull();
    expect(stats.liveStatsAvailable).toBe(false);
    expect(getMatchedRules).not.toHaveBeenCalled();
  });

  it("returns unavailable stats when matched-rule access is unavailable", async () => {
    (globalThis as Record<string, unknown>).chrome = {
      permissions: {
        contains: vi.fn().mockResolvedValue(true)
      },
      declarativeNetRequest: {}
    };

    const { getCurrentPageStats } = await import("../../src/background/currentPageStats");
    const stats = await getCurrentPageStats(7);

    expect(stats.total).toBeNull();
    expect(stats.liveStatsAvailable).toBe(false);
    expect(stats.byCategory.ads).toBe(0);
  });
});
