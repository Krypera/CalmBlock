import { describe, expect, it } from "vitest";
import { GlobalSettingsStore, parseSettingsExport } from "../../src/shared/settingsStore";
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
    expect(
      store.validateImportedSettings({
        version: 1,
        settings: ({ ...DEFAULT_SETTINGS, enabled: "yes" } as unknown),
        allowlist: ["example.com"]
      })
    ).toBe(false);
  });

  it("rejects unsupported versions and malformed allowlist entries", () => {
    const store = createStore();
    expect(
      store.validateImportedSettings({
        version: 2,
        settings: DEFAULT_SETTINGS,
        allowlist: ["example.com"]
      })
    ).toBe(false);

    expect(
      store.validateImportedSettings({
        version: 1,
        settings: DEFAULT_SETTINGS,
        allowlist: ["example.com", 42]
      })
    ).toBe(false);
  });
});

describe("parseSettingsExport", () => {
  it("returns null for malformed JSON", () => {
    expect(parseSettingsExport("{bad json")).toBeNull();
  });

  it("returns null for version mismatch", () => {
    const raw = JSON.stringify({
      version: 2,
      settings: DEFAULT_SETTINGS,
      allowlist: ["example.com"]
    });
    expect(parseSettingsExport(raw)).toBeNull();
  });

  it("parses valid settings export", () => {
    const raw = JSON.stringify({
      version: 1,
      settings: DEFAULT_SETTINGS,
      allowlist: ["example.com"]
    });
    const parsed = parseSettingsExport(raw);
    expect(parsed?.version).toBe(1);
    expect(parsed?.allowlist).toEqual(["example.com"]);
  });

  it("rejects malformed mixed-type payloads and trailing-comma JSON", () => {
    const malformedJson = `{
      "version": 1,
      "settings": {
        "enabled": true,
        "advancedMode": false,
        "groups": { "ads": true, "trackers": true, "annoyances": true, "strict": false, }
      },
      "allowlist": ["example.com"]
    }`;
    expect(parseSettingsExport(malformedJson)).toBeNull();

    const wrongTypes = JSON.stringify({
      version: 1,
      settings: {
        enabled: true,
        advancedMode: false,
        groups: { ads: true, trackers: "yes", annoyances: true, strict: false }
      },
      allowlist: ["example.com", null]
    });
    expect(parseSettingsExport(wrongTypes)).toBeNull();
  });

  it("accepts large exports and preserves duplicates for downstream normalization", () => {
    const largeAllowlist = Array.from({ length: 5000 }, (_, index) =>
      index % 2 === 0 ? "example.com" : `host-${index}.example`
    );
    const raw = JSON.stringify({
      version: 1,
      settings: DEFAULT_SETTINGS,
      allowlist: largeAllowlist
    });
    const parsed = parseSettingsExport(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.allowlist.length).toBe(5000);
    expect(parsed?.allowlist[0]).toBe("example.com");
  });
});
