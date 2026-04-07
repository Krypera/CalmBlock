import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cosmeticApply = vi.fn();
const cosmeticClear = vi.fn();
const annoyanceStart = vi.fn();
const annoyanceStop = vi.fn();

vi.mock("../../src/content/cosmeticEngine", () => ({
  CosmeticEngine: class {
    apply() {
      cosmeticApply();
    }
    clear() {
      cosmeticClear();
    }
  }
}));

vi.mock("../../src/content/annoyanceEngine", () => ({
  AnnoyanceEngine: class {
    start() {
      annoyanceStart();
    }
    stop() {
      annoyanceStop();
    }
  }
}));

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("content background re-sync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    cosmeticApply.mockReset();
    cosmeticClear.mockReset();
    annoyanceStart.mockReset();
    annoyanceStop.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retries background access and eventually enables engines", async () => {
    let calls = 0;
    vi.stubGlobal("browser", {
      runtime: {
        sendMessage: vi.fn(async () => {
          calls += 1;
          if (calls === 1) {
            throw new Error("no receiver");
          }
          return { ok: true, effectiveEnabled: true };
        }),
        onMessage: { addListener: vi.fn() }
      }
    });
    vi.stubGlobal("chrome", undefined);

    await import("../../src/content/index");
    await flush();
    expect(cosmeticApply).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(260);
    await flush();
    expect(cosmeticApply).toHaveBeenCalledTimes(1);
    expect(annoyanceStart).toHaveBeenCalledTimes(1);
    expect(annoyanceStart.mock.invocationCallOrder[0]).toBeLessThan(
      cosmeticApply.mock.invocationCallOrder[0]
    );
  });

  it("uses deferred re-sync after repeated failures", async () => {
    let calls = 0;
    vi.stubGlobal("browser", {
      runtime: {
        sendMessage: vi.fn(async () => {
          calls += 1;
          if (calls <= 5) {
            throw new Error("background unavailable");
          }
          return { ok: true, effectiveEnabled: true };
        }),
        onMessage: { addListener: vi.fn() }
      }
    });
    vi.stubGlobal("chrome", undefined);

    await import("../../src/content/index");
    await flush();

    await vi.advanceTimersByTimeAsync(250 + 750 + 1500 + 3000 + 20);
    await flush();
    expect(cosmeticApply).toHaveBeenCalledTimes(0);

    window.dispatchEvent(new Event("focus"));
    await flush();
    expect(cosmeticApply).toHaveBeenCalledTimes(1);
    expect(annoyanceStart).toHaveBeenCalledTimes(1);
    expect(annoyanceStart.mock.invocationCallOrder[0]).toBeLessThan(
      cosmeticApply.mock.invocationCallOrder[0]
    );
  });
});
