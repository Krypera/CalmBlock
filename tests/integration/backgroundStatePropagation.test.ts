import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../../src/shared/constants";

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("background state propagation", () => {
  afterEach(() => {
    vi.resetModules();
    delete (globalThis as Record<string, unknown>).chrome;
    delete (globalThis as Record<string, unknown>).browser;
  });

  it("applies global toggle once and propagates to all tabs", async () => {
    let onStorageChanged:
      | ((changes: Record<string, unknown>, areaName: string) => void | Promise<void>)
      | null = null;
    let onRuntimeMessage: ((message: unknown) => Promise<unknown>) | null = null;

    const updateEnabledRulesets = vi.fn().mockResolvedValue(undefined);
    const getDynamicRules = vi.fn().mockResolvedValue([]);
    const updateDynamicRules = vi.fn().mockResolvedValue(undefined);
    const tabsSendMessage = vi.fn().mockResolvedValue(undefined);
    const tabsQuery = vi.fn().mockResolvedValue([
      { id: 1, url: "https://alpha.example" },
      { id: 2, url: "https://beta.example" }
    ]);

    const state: Record<string, unknown> = {
      [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS },
      [STORAGE_KEYS.allowlist]: []
    };

    (globalThis as Record<string, unknown>).chrome = {
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onMessage: {
          addListener: (cb: (message: unknown) => Promise<unknown>) => {
            onRuntimeMessage = cb;
          }
        }
      },
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[] | Record<string, unknown>) => {
            if (Array.isArray(keys)) {
              const result: Record<string, unknown> = {};
              for (const key of keys) {
                result[key] = state[key];
              }
              return result;
            }
            if (typeof keys === "string") {
              return { [keys]: state[keys] };
            }
            return keys ?? {};
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            const changes: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(items)) {
              changes[key] = { oldValue: state[key], newValue: value };
              state[key] = value;
            }
            if (onStorageChanged) {
              void Promise.resolve(onStorageChanged(changes, "local"));
            }
          }),
          remove: vi.fn().mockResolvedValue(undefined)
        },
        onChanged: {
          addListener: (cb: (changes: Record<string, unknown>, areaName: string) => Promise<void>) => {
            onStorageChanged = cb;
          }
        }
      },
      tabs: {
        query: tabsQuery,
        sendMessage: tabsSendMessage,
        onUpdated: { addListener: vi.fn() }
      },
      action: {
        setBadgeText: vi.fn().mockResolvedValue(undefined),
        setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined)
      },
      declarativeNetRequest: {
        updateEnabledRulesets,
        getDynamicRules,
        updateDynamicRules
      }
    };

    await import("../../src/background/index");
    await flush();

    const initialSyncCalls = updateEnabledRulesets.mock.calls.length;
    if (!onRuntimeMessage) {
      throw new Error("Runtime message listener was not registered");
    }
    const runtimeMessage = onRuntimeMessage as (message: unknown) => Promise<unknown>;
    const response = (await runtimeMessage({
      type: "TOGGLE_GLOBAL",
      enabled: false
    })) as { ok: boolean; applyMode?: string };

    expect(response.ok).toBe(true);
    expect(response.applyMode).toBe("instant");
    expect(updateEnabledRulesets.mock.calls.length).toBe(initialSyncCalls + 1);
    expect(tabsQuery).toHaveBeenCalledWith({});
    const sent = tabsSendMessage.mock.calls
      .map((args) => args[1])
      .filter((message) => message?.type === "PROTECTION_STATE_CHANGED");
    expect(sent.slice(-2)).toEqual([
      { type: "PROTECTION_STATE_CHANGED", effectiveEnabled: false },
      { type: "PROTECTION_STATE_CHANGED", effectiveEnabled: false }
    ]);
  });

  it("propagates per-site pause across tabs with host-specific effective state", async () => {
    let onStorageChanged:
      | ((changes: Record<string, unknown>, areaName: string) => void | Promise<void>)
      | null = null;
    let onRuntimeMessage: ((message: unknown) => Promise<unknown>) | null = null;

    const tabsSendMessage = vi.fn().mockResolvedValue(undefined);
    const state: Record<string, unknown> = {
      [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, enabled: true },
      [STORAGE_KEYS.allowlist]: []
    };

    (globalThis as Record<string, unknown>).chrome = {
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onMessage: {
          addListener: (cb: (message: unknown) => Promise<unknown>) => {
            onRuntimeMessage = cb;
          }
        }
      },
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[] | Record<string, unknown>) => {
            if (Array.isArray(keys)) {
              const result: Record<string, unknown> = {};
              for (const key of keys) {
                result[key] = state[key];
              }
              return result;
            }
            if (typeof keys === "string") {
              return { [keys]: state[keys] };
            }
            return keys ?? {};
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            const changes: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(items)) {
              changes[key] = { oldValue: state[key], newValue: value };
              state[key] = value;
            }
            if (onStorageChanged) {
              void Promise.resolve(onStorageChanged(changes, "local"));
            }
          }),
          remove: vi.fn().mockResolvedValue(undefined)
        },
        onChanged: {
          addListener: (cb: (changes: Record<string, unknown>, areaName: string) => Promise<void>) => {
            onStorageChanged = cb;
          }
        }
      },
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 1, url: "https://alpha.example/page" },
          { id: 2, url: "https://beta.example/home" }
        ]),
        sendMessage: tabsSendMessage,
        onUpdated: { addListener: vi.fn() }
      },
      action: {
        setBadgeText: vi.fn().mockResolvedValue(undefined),
        setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined)
      },
      declarativeNetRequest: {
        updateEnabledRulesets: vi.fn().mockResolvedValue(undefined),
        getDynamicRules: vi.fn().mockResolvedValue([]),
        updateDynamicRules: vi.fn().mockResolvedValue(undefined)
      }
    };

    await import("../../src/background/index");
    await flush();

    if (!onRuntimeMessage) {
      throw new Error("Runtime message listener was not registered");
    }
    const runtimeMessage = onRuntimeMessage as (message: unknown) => Promise<unknown>;
    const response = (await runtimeMessage({
      type: "TOGGLE_SITE",
      host: "alpha.example",
      enabled: false,
      tabId: 1
    })) as { ok: boolean; applyMode?: string };

    expect(response.ok).toBe(true);
    expect(response.applyMode).toBe("reload-recommended");

    const sent = tabsSendMessage.mock.calls
      .map((args) => args[1])
      .filter((message) => message?.type === "PROTECTION_STATE_CHANGED");
    expect(sent.slice(-2)).toEqual([
      { type: "PROTECTION_STATE_CHANGED", effectiveEnabled: false },
      { type: "PROTECTION_STATE_CHANGED", effectiveEnabled: true }
    ]);
  });
});
