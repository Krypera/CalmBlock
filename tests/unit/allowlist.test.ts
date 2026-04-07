import { describe, expect, it } from "vitest";
import { sanitizeHostInput, SiteSettingsStore, normalizeHost } from "../../src/shared/siteSettingsStore";
import { MAX_ALLOWLIST_HOSTS, summarizeAllowlistCapacity } from "../../src/shared/dnrAllowlist";

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

  it("keeps newest disabled host at the front of the allowlist", async () => {
    let allowlist = ["older.example", "oldest.example"];
    const store = new SiteSettingsStore({
      async get(_key, fallback) {
        return (allowlist.length ? allowlist : fallback) as typeof fallback;
      },
      async set(_key, value) {
        allowlist = value as string[];
      }
    });

    await store.setHostEnabled("fresh.example", false);

    expect(allowlist[0]).toBe("fresh.example");
  });

  it("normalizes large noisy allowlists with duplicates, whitespace, and invalid hosts", async () => {
    let allowlist: string[] = [];
    const store = new SiteSettingsStore({
      async get(_key, fallback) {
        return (allowlist.length ? allowlist : fallback) as typeof fallback;
      },
      async set(_key, value) {
        allowlist = value as string[];
      }
    });

    const input = [
      "  EXAMPLE.com  ",
      "https://example.com/path",
      "sub.example.com",
      "sub.example.com  ",
      "bad host",
      "",
      "   ",
      "localhost",
      "http://127.0.0.1:8080",
      "https://",
      "...example.com..."
    ];
    const expanded = Array.from({ length: 1000 }, (_, index) =>
      index % 3 === 0 ? `dup-${index}.example` : "example.com"
    );
    const saved = await store.setAllowlist([...input, ...expanded]);

    expect(saved).toContain("example.com");
    expect(saved).toContain("sub.example.com");
    expect(saved).toContain("localhost");
    expect(saved).toContain("127.0.0.1");
    expect(saved).not.toContain("bad host");
    expect(saved.length).toBeGreaterThan(300);
  });
});

describe("summarizeAllowlistCapacity", () => {
  it("reports overflow instead of silently hiding it", () => {
    const summary = summarizeAllowlistCapacity(
      Array.from({ length: MAX_ALLOWLIST_HOSTS + 2 }, (_, index) => `host-${index}.example`)
    );

    expect(summary.activeHosts).toBe(MAX_ALLOWLIST_HOSTS);
    expect(summary.pendingHosts).toBe(2);
    expect(summary.overflowed).toBe(true);
  });
});
