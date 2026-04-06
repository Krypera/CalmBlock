import { describe, expect, it } from "vitest";
import { derivePopupState } from "../../src/shared/popupState";
import { DEFAULT_SETTINGS } from "../../src/shared/constants";

describe("derivePopupState", () => {
  it("derives site and global booleans", () => {
    const state = derivePopupState({
      host: "example.com",
      global: DEFAULT_SETTINGS,
      siteDisabled: false,
      blockedCount: 12
    });
    expect(state.globalEnabled).toBe(true);
    expect(state.siteEnabled).toBe(true);
    expect(state.blockedCount).toBe(12);
  });

  it("marks site as not protected when global protection is off", () => {
    const global = { ...DEFAULT_SETTINGS, enabled: false };
    const state = derivePopupState({
      host: "example.com",
      global,
      siteDisabled: false,
      blockedCount: 0
    });
    expect(state.globalEnabled).toBe(false);
    expect(state.siteEnabled).toBe(true);
    expect(state.siteDisabled).toBe(false);
    expect(state.effectiveProtectionEnabled).toBe(false);
  });

  it("keeps site disable preference independent from global state", () => {
    const state = derivePopupState({
      host: "example.com",
      global: DEFAULT_SETTINGS,
      siteDisabled: true,
      blockedCount: 0
    });
    expect(state.siteEnabled).toBe(false);
    expect(state.siteDisabled).toBe(true);
    expect(state.effectiveProtectionEnabled).toBe(false);
  });
});
