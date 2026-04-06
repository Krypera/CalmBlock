import { describe, expect, it } from "vitest";
import { GlobalSettingsStore } from "../../src/shared/settingsStore";
import { DEFAULT_SETTINGS } from "../../src/shared/constants";

describe("options persistence behavior", () => {
  it("persists updated group settings", async () => {
    let value = structuredClone(DEFAULT_SETTINGS);
    const store = new GlobalSettingsStore({
      async get(_key, fallback) {
        return (value ?? fallback) as typeof fallback;
      },
      async set(_key, next) {
        value = next as typeof value;
      }
    });

    await store.update({
      groups: {
        ...value.groups,
        strict: true
      }
    });
    const next = await store.get();
    expect(next.groups.strict).toBe(true);
  });
});

