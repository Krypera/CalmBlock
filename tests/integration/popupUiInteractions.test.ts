import { afterEach, describe, expect, it, vi } from "vitest";
import type { MessageResponse } from "../../src/shared/messages";
import type { PopupState } from "../../src/shared/types";

const POPUP_DOM = `
  <main>
    <p id="active-host" class="hidden"></p>
    <span id="global-state"></span>
    <button id="global-toggle" type="button"></button>
    <span id="site-state"></span>
    <button id="site-toggle" type="button"></button>
    <p id="site-status"></p>
    <strong id="blocked-count"></strong>
    <div id="category-summary"></div>
    <p id="blocked-note"></p>
    <button id="enable-live-counters" type="button" class="hidden"></button>
    <p id="reload-hint" class="hidden"></p>
  </main>
`;

function buildState(overrides: Partial<PopupState> = {}): PopupState {
  return {
    host: "example.com",
    globalEnabled: true,
    siteEnabled: true,
    siteDisabled: false,
    effectiveProtectionEnabled: true,
    protectedSummary: "All core protections are active.",
    blockedCount: 3,
    liveStatsAvailable: true,
    liveStatsStatus: "live",
    liveStatsMessage: "Live counts for the current tab.",
    activeProtectionGroups: ["ads", "trackers", "annoyances"],
    blockedByCategory: {
      ads: 1,
      trackers: 1,
      annoyances: 1,
      strict: 0
    },
    ...overrides
  };
}

function createDeferred<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise
  };
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function bootPopup(browserMock: unknown): Promise<void> {
  vi.resetModules();
  vi.doMock("../../src/shared/permissionManager", () => ({
    PermissionManager: class {
      async requestFeedbackPermission() {
        return false;
      }
    }
  }));
  vi.stubGlobal("browser", browserMock);
  vi.stubGlobal("chrome", undefined);
  document.body.innerHTML = POPUP_DOM;
  await import("../../src/popup/index");
  await flushAsyncWork();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("popup UI interactions", () => {
  it("sends the correct payload for site toggle click and exposes pending state", async () => {
    const toggleDeferred = createDeferred<MessageResponse>();
    const sendMessage = vi.fn(async (message: Record<string, unknown>) => {
      if (message.type === "GET_POPUP_STATE") {
        return { ok: true, state: buildState() } satisfies MessageResponse;
      }
      if (message.type === "TOGGLE_SITE") {
        return toggleDeferred.promise;
      }
      return { ok: true } satisfies MessageResponse;
    });

    await bootPopup({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 17, url: "https://example.com/path" }])
      },
      runtime: {
        sendMessage
      }
    });

    const siteToggle = document.querySelector<HTMLButtonElement>("#site-toggle");
    if (!siteToggle) {
      throw new Error("Missing site toggle button");
    }
    siteToggle.click();
    await flushAsyncWork();

    expect(sendMessage).toHaveBeenCalledWith({
      type: "TOGGLE_SITE",
      host: "example.com",
      enabled: false,
      tabId: 17
    });
    expect(siteToggle.classList.contains("pending")).toBe(true);
    expect(siteToggle.disabled).toBe(true);

    toggleDeferred.resolve({
      ok: true,
      applyMode: "reload-recommended",
      applySummary: { immediate: ["ok"], afterReload: ["reload"] }
    });
    await flushAsyncWork();
    await flushAsyncWork();

    expect(siteToggle.classList.contains("pending")).toBe(false);
    expect(document.querySelector("#active-host")?.textContent).toContain("example.com");
    expect(document.querySelector("#reload-hint")?.textContent).toContain("Reload needed");
  });

  it("shows explicit no-active-tab state", async () => {
    await bootPopup({
      tabs: {
        query: vi.fn().mockResolvedValue([])
      },
      runtime: {
        sendMessage: vi.fn()
      }
    });

    expect(document.querySelector("#site-status")?.textContent).toContain("No active tab");
  });

  it("shows explicit unsupported-page state", async () => {
    await bootPopup({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 3, url: "about:config" }])
      },
      runtime: {
        sendMessage: vi.fn()
      }
    });

    expect(document.querySelector("#site-status")?.textContent).toContain("unsupported");
  });

  it("treats internal browser pages as unsupported", async () => {
    await bootPopup({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 33, url: "chrome://extensions" }])
      },
      runtime: {
        sendMessage: vi.fn()
      }
    });

    expect(document.querySelector("#site-status")?.textContent).toContain("unsupported");
  });

  it("treats extension-internal pages as unsupported", async () => {
    await bootPopup({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 34, url: "moz-extension://abc123/debug.html" }])
      },
      runtime: {
        sendMessage: vi.fn()
      }
    });

    expect(document.querySelector("#site-status")?.textContent).toContain("unsupported");
  });

  it("shows explicit message-failed state when popup message errors", async () => {
    await bootPopup({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 9, url: "https://example.com" }])
      },
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({ ok: false, error: "background-unavailable" })
      }
    });

    expect(document.querySelector("#site-status")?.textContent).toContain("Could not load");
    expect(document.querySelector("#blocked-note")?.textContent).toContain("background-unavailable");
  });

  it("shows loading state while popup state request is in flight", async () => {
    const stateDeferred = createDeferred<MessageResponse>();
    await bootPopup({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 11, url: "https://example.com" }])
      },
      runtime: {
        sendMessage: vi.fn().mockImplementation(async (message: Record<string, unknown>) => {
          if (message.type === "GET_POPUP_STATE") {
            return stateDeferred.promise;
          }
          return { ok: true };
        })
      }
    });

    expect(document.querySelector("#site-status")?.textContent).toContain("Loading");

    stateDeferred.resolve({ ok: true, state: buildState() });
    await flushAsyncWork();
    await flushAsyncWork();

    expect(document.querySelector("#site-status")?.textContent).toContain("currently protected");
  });

  it("shows runtime error text when global toggle message fails", async () => {
    const sendMessage = vi.fn(async (message: Record<string, unknown>) => {
      if (message.type === "GET_POPUP_STATE") {
        return { ok: true, state: buildState() } satisfies MessageResponse;
      }
      if (message.type === "TOGGLE_GLOBAL") {
        return { ok: false, error: "toggle-failed" } satisfies MessageResponse;
      }
      return { ok: true } satisfies MessageResponse;
    });
    await bootPopup({
      tabs: { query: vi.fn().mockResolvedValue([{ id: 10, url: "https://example.com" }]) },
      runtime: { sendMessage }
    });

    const globalToggle = document.querySelector<HTMLButtonElement>("#global-toggle");
    if (!globalToggle) {
      throw new Error("Missing global toggle");
    }
    globalToggle.click();
    await flushAsyncWork();

    expect(document.querySelector("#blocked-note")?.textContent).toContain("toggle-failed");
    expect(globalToggle.classList.contains("pending")).toBe(false);
  });

  it("ignores concurrent site-toggle clicks while pending", async () => {
    const deferred = createDeferred<MessageResponse>();
    const sendMessage = vi.fn(async (message: Record<string, unknown>) => {
      if (message.type === "GET_POPUP_STATE") {
        return { ok: true, state: buildState() } satisfies MessageResponse;
      }
      if (message.type === "TOGGLE_SITE") {
        return deferred.promise;
      }
      return { ok: true } satisfies MessageResponse;
    });
    await bootPopup({
      tabs: { query: vi.fn().mockResolvedValue([{ id: 12, url: "https://example.com" }]) },
      runtime: { sendMessage }
    });

    const siteToggle = document.querySelector<HTMLButtonElement>("#site-toggle");
    if (!siteToggle) {
      throw new Error("Missing site toggle");
    }
    siteToggle.click();
    siteToggle.click();
    await flushAsyncWork();

    const siteCalls = sendMessage.mock.calls.filter(
      ([message]) => (message as Record<string, unknown>)?.type === "TOGGLE_SITE"
    );
    expect(siteCalls).toHaveLength(1);

    deferred.resolve({
      ok: true,
      applyMode: "reload-recommended",
      applySummary: { immediate: ["ok"], afterReload: [] }
    });
    await flushAsyncWork();
  });

  it("keeps live counters off when optional permission is denied", async () => {
    await bootPopup({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 14, url: "https://example.com" }])
      },
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({
          ok: true,
          state: buildState({
            liveStatsAvailable: false,
            liveStatsStatus: "permission-required",
            liveStatsMessage:
              "Active protections: Ads, Trackers, Annoyances. Grant the optional feedback permission to show live counts."
          })
        })
      }
    });

    const button = document.querySelector<HTMLButtonElement>("#enable-live-counters");
    if (!button) {
      throw new Error("Missing live-counters button");
    }
    expect(button.classList.contains("hidden")).toBe(false);
    button.click();
    await flushAsyncWork();

    expect(document.querySelector("#blocked-note")?.textContent).toContain("stayed off");
  });
});
