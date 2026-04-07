import { describe, expect, it } from "vitest";
import { BrowserAdapter } from "../../src/shared/browserAdapter";

describe("BrowserAdapter.detectTarget", () => {
  it("detects firefox", () => {
    expect(BrowserAdapter.detectTarget("Mozilla Firefox/124.0")).toBe("firefox");
  });

  it("detects edge", () => {
    expect(BrowserAdapter.detectTarget("Mozilla Edg/122.0")).toBe("edge");
  });

  it("detects orion", () => {
    expect(
      BrowserAdapter.detectTarget(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Orion/0.99.128"
      )
    ).toBe("orion");
  });

  it("detects safari", () => {
    expect(
      BrowserAdapter.detectTarget(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
      )
    ).toBe("safari");
  });

  it("extracts browser version from runtime info", () => {
    expect(
      BrowserAdapter.getRuntimeInfo(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Orion/0.99.128"
      )
    ).toEqual({
      target: "orion",
      browserVersion: "0.99.128"
    });
  });

  it("prefers runtime capability signals over ambiguous user agents", () => {
    expect(
      BrowserAdapter.detectTarget("Mozilla/5.0", {
        runtime: {
          getURL: () => "moz-extension://abc123/"
        }
      })
    ).toBe("firefox");
  });

  it("reports probed browser capabilities", () => {
    expect(
      BrowserAdapter.getCapabilities({
        storage: {
          local: {
            get: async () => ({}),
            set: async () => {}
          }
        },
        permissions: {
          contains: async () => true,
          request: async () => true
        },
        declarativeNetRequest: {
          updateEnabledRulesets: async () => {},
          getDynamicRules: async () => [],
          updateDynamicRules: async () => {},
          getMatchedRules: async () => ({ rulesMatchedInfo: [] })
        }
      })
    ).toEqual({
      storageLocal: true,
      declarativeNetRequest: true,
      dynamicRules: true,
      matchedRuleTelemetry: true,
      optionalPermissionsQuery: true,
      optionalPermissionsRequest: true
    });
  });
});
