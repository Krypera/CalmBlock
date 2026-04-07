import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("RulesetManager allowlist sync", () => {
  it("uses incremental diff instead of remove-all/add-all", async () => {
    const updateDynamicRules = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("browser", {
      declarativeNetRequest: {
        getDynamicRules: vi.fn().mockResolvedValue([
          {
            id: 100000,
            priority: 10000,
            action: { type: "allow" },
            condition: {
              initiatorDomains: ["example.com"],
              resourceTypes: ["script", "xmlhttprequest"]
            }
          },
          {
            id: 100001,
            priority: 10000,
            action: { type: "allow" },
            condition: {
              requestDomains: ["example.com"],
              resourceTypes: ["main_frame", "sub_frame"]
            }
          }
        ]),
        updateDynamicRules
      }
    });
    vi.stubGlobal("chrome", undefined);

    const { RulesetManager } = await import("../../src/background/rulesetManager");
    const manager = new RulesetManager();
    await manager.syncAllowlistRules(["example.com", "news.example.com"]);

    const payload = updateDynamicRules.mock.calls[0]?.[0] as
      | { removeRuleIds: number[]; addRules: Array<{ id: number }> }
      | undefined;
    expect(payload).toBeDefined();
    expect(payload?.removeRuleIds).toContain(100000);
    expect(payload?.addRules.map((rule) => rule.id)).toEqual([100000, 100002, 100003]);
  });

  it("skips dynamic update when existing allowlist rules already match", async () => {
    const updateDynamicRules = vi.fn().mockResolvedValue(undefined);
    const existingRules = [
      {
        id: 100000,
        priority: 10000,
        action: { type: "allow" },
        condition: {
          initiatorDomains: ["example.com"],
          resourceTypes: [
            "main_frame",
            "sub_frame",
            "script",
            "stylesheet",
            "image",
            "font",
            "object",
            "xmlhttprequest",
            "ping",
            "media",
            "websocket",
            "other"
          ]
        }
      },
      {
        id: 100001,
        priority: 10000,
        action: { type: "allow" },
        condition: {
          requestDomains: ["example.com"],
          resourceTypes: ["main_frame", "sub_frame"]
        }
      }
    ];
    vi.stubGlobal("browser", {
      declarativeNetRequest: {
        getDynamicRules: vi.fn().mockResolvedValue(existingRules),
        updateDynamicRules
      }
    });
    vi.stubGlobal("chrome", undefined);

    const { RulesetManager } = await import("../../src/background/rulesetManager");
    const manager = new RulesetManager();
    await manager.syncAllowlistRules(["example.com"]);

    expect(updateDynamicRules).not.toHaveBeenCalled();
  });
});
