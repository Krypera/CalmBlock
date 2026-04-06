import { describe, expect, it } from "vitest";
import { SiteSettingsStore } from "../../src/shared/siteSettingsStore";

describe("site toggle flow", () => {
  it("disables and re-enables site through allowlist", async () => {
    let allowlist: string[] = [];
    const store = new SiteSettingsStore({
      async get(_key, fallback) {
        return (allowlist.length ? allowlist : fallback) as typeof fallback;
      },
      async set(_key, value) {
        allowlist = value as string[];
      }
    });

    await store.setHostEnabled("example.org", false);
    expect(allowlist).toEqual(["example.org"]);
    await store.setHostEnabled("example.org", true);
    expect(allowlist).toEqual([]);
  });
});

