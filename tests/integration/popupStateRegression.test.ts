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
    const settingsStore = {
      get: async () => ({ ...DEFAULT_SETTINGS, enabled: false })
    };
    const siteStore = {
      isAllowlisted: async () => false
    };
    const service = new PopupStateService(
      settingsStore as ConstructorParameters<typeof PopupStateService>[0],
      siteStore as unknown as ConstructorParameters<typeof PopupStateService>[1]
    );

    const state = await service.getState(1, "https://example.com");
    expect(state.globalEnabled).toBe(false);
    expect(state.siteEnabled).toBe(true);
    expect(state.siteDisabled).toBe(false);
    expect(state.effectiveProtectionEnabled).toBe(false);
  });

  it("marks protection as ineffective when global is on but site is paused", async () => {
    const settingsStore = {
      get: async () => ({ ...DEFAULT_SETTINGS, enabled: true })
    };
    const siteStore = {
      isAllowlisted: async () => true
    };
    const service = new PopupStateService(
      settingsStore as ConstructorParameters<typeof PopupStateService>[0],
      siteStore as unknown as ConstructorParameters<typeof PopupStateService>[1]
    );

    const state = await service.getState(1, "https://example.com");
    expect(state.globalEnabled).toBe(true);
    expect(state.siteEnabled).toBe(false);
    expect(state.siteDisabled).toBe(true);
    expect(state.effectiveProtectionEnabled).toBe(false);
  });
});
