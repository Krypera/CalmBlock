import { describe, expect, it, vi } from "vitest";
import { PopupStateService } from "../../src/background/popupStateService";
import { DEFAULT_SETTINGS } from "../../src/shared/constants";

vi.mock("../../src/background/currentPageStats", () => ({
  getCurrentPageStats: vi.fn().mockResolvedValue({
    total: null,
    liveStatsAvailable: false,
    byCategory: {
      ads: 0,
      trackers: 0,
      annoyances: 0,
      strict: 0
    }
  })
}));

describe("popup protection state regression", () => {
  it("marks protection as ineffective when global is off but site is enabled", async () => {
    const service = new PopupStateService(
      {
        get: async () => ({ ...DEFAULT_SETTINGS, enabled: false })
      } as any,
      {
        isAllowlisted: async () => false
      } as any
    );

    const state = await service.getState(1, "https://example.com");
    expect(state.globalEnabled).toBe(false);
    expect(state.siteEnabled).toBe(true);
    expect(state.siteDisabled).toBe(false);
    expect(state.effectiveProtectionEnabled).toBe(false);
  });

  it("marks protection as ineffective when global is on but site is paused", async () => {
    const service = new PopupStateService(
      {
        get: async () => ({ ...DEFAULT_SETTINGS, enabled: true })
      } as any,
      {
        isAllowlisted: async () => true
      } as any
    );

    const state = await service.getState(1, "https://example.com");
    expect(state.globalEnabled).toBe(true);
    expect(state.siteEnabled).toBe(false);
    expect(state.siteDisabled).toBe(true);
    expect(state.effectiveProtectionEnabled).toBe(false);
  });
});
