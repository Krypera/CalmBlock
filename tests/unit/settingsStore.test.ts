import { describe, expect, it } from "vitest";
import { GlobalSettingsStore } from "../../src/shared/settingsStore";
import { DEFAULT_SETTINGS } from "../../src/shared/constants";
import type { GlobalSettings } from "../../src/shared/types";

function createStore(seed?: GlobalSettings) {
  let settings = seed ?? DEFAULT_SETTINGS;
  return new GlobalSettingsStore({
    async get(_key, fallback) {
      return (settings ?? fallback) as typeof fallback;
    },
    async set(_key, value) {
      settings = value as GlobalSettings;
    }
  });
}

describe("GlobalSettingsStore", () => {
  it("returns defaults when empty-like", async () => {
    const store = createStore(DEFAULT_SETTINGS);
    const value = await store.get();
    expect(value).toEqual(DEFAULT_SETTINGS);
  });

  it("updates existing settings", async () => {
    const store = createStore();
    const next = await store.update({ enabled: false, groups: { strict: true } as never });
    expect(next.enabled).toBe(false);
    expect(next.groups.strict).toBe(true);
    expect(next.groups.ads).toBe(true);
  });

  it("validates import payload shape", () => {
    const store = createStore();
    expect(
      store.validateImportedSettings({
        version: 1,
        settings: DEFAULT_SETTINGS,
        allowlist: ["example.com"]
      })
    ).toBe(true);
    expect(store.validateImportedSettings({ version: 2 })).toBe(false);
  });
});

