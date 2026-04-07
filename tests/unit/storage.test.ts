import { afterEach, describe, expect, it, vi } from "vitest";

describe("ExtensionStorage fallback", () => {
  afterEach(() => {
    vi.resetModules();
    delete (globalThis as Record<string, unknown>).chrome;
    delete (globalThis as Record<string, unknown>).browser;
  });

  it("falls back to in-memory storage when native storage is unavailable", async () => {
    const { ExtensionStorage, getStorageStatus } = await import("../../src/shared/storage");
    const storage = new ExtensionStorage();

    await storage.set("example", { ok: true });

    expect(await storage.get("example", null)).toEqual({ ok: true });
    expect(getStorageStatus().mode).toBe("memory-fallback");
  });
});
