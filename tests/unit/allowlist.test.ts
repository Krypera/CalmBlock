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

  it("normalizes large URL/host mixes and removes duplicates", async () => {
    let allowlist: string[] = [];
    const store = new SiteSettingsStore({
      async get(_key, fallback) {
        return (allowlist.length ? allowlist : fallback) as typeof fallback;
      },
      async set(_key, value) {
        allowlist = value as string[];
      }
    });

    const largeInput = Array.from({ length: 300 }, (_, i) =>
      i % 3 === 0 ? "https://Example.com/path?a=1" : i % 3 === 1 ? "example.com" : "sub.example.com"
    );
    const saved = await store.setAllowlist(largeInput);

    expect(saved).toEqual(["example.com", "sub.example.com"]);
    expect(await store.isAllowlisted("https://EXAMPLE.com")).toBe(true);
  });

  it("drops invalid lines while keeping valid hosts", async () => {
    let allowlist: string[] = [];
    const store = new SiteSettingsStore({
      async get(_key, fallback) {
        return (allowlist.length ? allowlist : fallback) as typeof fallback;
      },
      async set(_key, value) {
        allowlist = value as string[];
      }
    });

    const saved = await store.setAllowlist([
      "https://valid.example",
      "bad host",
      "http://",
      "localhost",
      "127.0.0.1",
      "valid.example"
    ]);

    expect(saved).toEqual(["valid.example", "localhost", "127.0.0.1"]);
  });
});
