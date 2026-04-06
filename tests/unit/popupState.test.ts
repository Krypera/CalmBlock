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
});

