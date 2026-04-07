import { afterEach, describe, expect, it, vi } from "vitest";

const OPTIONS_DOM = `
  <main>
    <p id="save-status"></p>
    <textarea id="allowlist"></textarea>
    <p id="allowlist-meta"></p>
    <p id="allowlist-warning" class="hidden"></p>
    <input id="allowlist-search" />
    <select id="allowlist-sort">
      <option value="newest">newest</option>
      <option value="az">az</option>
      <option value="za">za</option>
    </select>
    <div id="allowlist-capacity-fill"></div>
    <div id="allowlist-items"></div>
    <button id="save-allowlist" type="button"></button>
    <input id="advanced-mode" type="checkbox" />
    <button id="export-settings" type="button"></button>
    <button id="import-settings" type="button"></button>
    <input id="import-file" type="file" />
    <a id="debug-link"></a>
    <p id="storage-warning"></p>
    <input id="group-ads" type="checkbox" />
    <input id="group-trackers" type="checkbox" />
    <input id="group-annoyances" type="checkbox" />
    <input id="group-strict" type="checkbox" />
  </main>
`;

async function flush(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function bootOptions(seedAllowlist: string[]) {
  vi.resetModules();
  document.body.innerHTML = OPTIONS_DOM;
  let allowlist = [...seedAllowlist];
  vi.doMock("../../src/shared/settingsStore", () => ({
    GlobalSettingsStore: class {
      async get() {
        return {
          enabled: true,
          advancedMode: true,
          groups: { ads: true, trackers: true, annoyances: true, strict: false }
        };
      }
      async set() {}
      async update() {
        return {
          enabled: true,
          advancedMode: true,
          groups: { ads: true, trackers: true, annoyances: true, strict: false }
        };
      }
    },
    parseSettingsExport: vi.fn().mockReturnValue(null)
  }));
  vi.doMock("../../src/shared/siteSettingsStore", () => ({
    sanitizeHostInput: (value: string) => value.trim().toLowerCase() || null,
    SiteSettingsStore: class {
      async getAllowlist() {
        return [...allowlist];
      }
      async setAllowlist(next: string[]) {
        allowlist = [...new Set(next)];
        return allowlist;
      }
    }
  }));
  vi.doMock("../../src/shared/storage", () => ({
    getStorageStatus: () => ({ mode: "native", warning: null })
  }));
  await import("../../src/options/index");
  await flush();
  return {
    getAllowlist: () => [...allowlist]
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("options allowlist UX", () => {
  it("supports search, sorting, and single-item removal", async () => {
    const state = await bootOptions(["zeta.example", "alpha.example", "beta.example"]);
    const sortEl = document.querySelector<HTMLSelectElement>("#allowlist-sort");
    const searchEl = document.querySelector<HTMLInputElement>("#allowlist-search");
    const listEl = document.querySelector<HTMLElement>("#allowlist-items");
    if (!sortEl || !searchEl || !listEl) {
      throw new Error("Missing allowlist controls");
    }

    sortEl.value = "az";
    sortEl.dispatchEvent(new Event("change"));
    await flush();
    expect(listEl.textContent).toContain("alpha.example");

    searchEl.value = "beta";
    searchEl.dispatchEvent(new Event("input"));
    await flush();
    expect(listEl.textContent).toContain("beta.example");
    expect(listEl.textContent).not.toContain("alpha.example");

    const removeButton = [...listEl.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Remove")
    );
    removeButton?.dispatchEvent(new Event("click"));
    await flush();
    expect(state.getAllowlist()).not.toContain("beta.example");
  });
});
