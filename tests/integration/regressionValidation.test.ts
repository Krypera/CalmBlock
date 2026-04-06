import { describe, expect, it } from "vitest";
import { GlobalSettingsStore } from "../../src/shared/settingsStore";
import { DEFAULT_SETTINGS } from "../../src/shared/constants";

describe("settings import regression validation", () => {
  it("rejects malformed settings payloads", () => {
    const store = new GlobalSettingsStore({
      async get(_key, fallback) {
        return fallback;
      },
      async set() {}
    });

    expect(
      store.validateImportedSettings({
        version: 1,
        settings: DEFAULT_SETTINGS,
        allowlist: "not-an-array"
      })
    ).toBe(false);
  });
});

