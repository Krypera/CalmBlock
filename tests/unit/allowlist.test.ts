import { describe, expect, it } from "vitest";
import { sanitizeHostInput, SiteSettingsStore, normalizeHost } from "../../src/shared/siteSettingsStore";

describe("normalizeHost", () => {
  it("normalizes casing and dots", () => {
    expect(normalizeHost(".Example.COM.")).toBe("example.com");
  });

  it("parses host from URL-like input", () => {
    expect(normalizeHost("https://Example.com/path?a=1")).toBe("example.com");
  });
});

describe("sanitizeHostInput", () => {
  it("rejects invalid hosts", () => {
    expect(sanitizeHostInput("bad host")).toBeNull();
    expect(sanitizeHostInput("https://")).toBeNull();
  });
});

describe("SiteSettingsStore", () => {
  it("adds and removes host enable states", async () => {
    let allowlist: string[] = [];
    const store = new SiteSettingsStore({
      async get(_key, fallback) {
        return (allowlist.length ? allowlist : fallback) as typeof fallback;
      },
      async set(_key, value) {
        allowlist = value as string[];
      }
    });

    await store.setHostEnabled("example.com", false);
    expect(await store.isAllowlisted("example.com")).toBe(true);
    await store.setHostEnabled("example.com", true);
    expect(await store.isAllowlisted("example.com")).toBe(false);
  });
});
