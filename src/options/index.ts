import { DEFAULT_SETTINGS, PROTECTION_GROUPS } from "../shared/constants";
import { GlobalSettingsStore } from "../shared/settingsStore";
import { SiteSettingsStore } from "../shared/siteSettingsStore";
import type { GlobalSettings, SettingsExport } from "../shared/types";

const settingsStore = new GlobalSettingsStore();
const siteStore = new SiteSettingsStore();

const saveStatus = document.querySelector<HTMLParagraphElement>("#save-status");
const allowlistEl = document.querySelector<HTMLTextAreaElement>("#allowlist");
const saveAllowlistBtn = document.querySelector<HTMLButtonElement>("#save-allowlist");
const advancedModeEl = document.querySelector<HTMLInputElement>("#advanced-mode");
const exportBtn = document.querySelector<HTMLButtonElement>("#export-settings");
const importBtn = document.querySelector<HTMLButtonElement>("#import-settings");
const importFile = document.querySelector<HTMLInputElement>("#import-file");
const debugLink = document.querySelector<HTMLAnchorElement>("#debug-link");

function setStatus(text: string) {
  if (saveStatus) {
    saveStatus.textContent = text;
  }
}

function parseAllowlistInput(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function serializeSettings(settings: GlobalSettings, allowlist: string[]): string {
  const payload: SettingsExport = {
    version: 1,
    settings,
    allowlist
  };
  return JSON.stringify(payload, null, 2);
}

async function load() {
  const [settings, allowlist] = await Promise.all([settingsStore.get(), siteStore.getAllowlist()]);
  for (const group of PROTECTION_GROUPS) {
    const el = document.querySelector<HTMLInputElement>(`#group-${group}`);
    if (!el) {
      continue;
    }
    el.checked = settings.groups[group];
    el.addEventListener("change", async () => {
      const next = await settingsStore.get();
      next.groups[group] = el.checked;
      await settingsStore.set(next);
      setStatus(`Saved ${group} group state.`);
    });
  }

  if (allowlistEl) {
    allowlistEl.value = allowlist.join("\n");
  }
  if (advancedModeEl) {
    advancedModeEl.checked = settings.advancedMode;
    debugLink?.classList.toggle("hidden", !settings.advancedMode);
    advancedModeEl.addEventListener("change", async () => {
      await settingsStore.update({ advancedMode: advancedModeEl.checked });
      debugLink?.classList.toggle("hidden", !advancedModeEl.checked);
      setStatus("Saved advanced mode setting.");
    });
  }
}

saveAllowlistBtn?.addEventListener("click", async () => {
  if (!allowlistEl) {
    return;
  }
  const hosts = parseAllowlistInput(allowlistEl.value);
  const saved = await siteStore.setAllowlist(hosts);
  allowlistEl.value = saved.join("\n");
  setStatus("Allowlist saved.");
});

exportBtn?.addEventListener("click", async () => {
  const [settings, allowlist] = await Promise.all([settingsStore.get(), siteStore.getAllowlist()]);
  const blob = new Blob([serializeSettings(settings, allowlist)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "calmblock-settings.json";
  link.click();
  URL.revokeObjectURL(url);
});

importBtn?.addEventListener("click", () => {
  importFile?.click();
});

importFile?.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) {
    return;
  }

  const raw = await file.text();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!settingsStore.validateImportedSettings(parsed)) {
      setStatus("Import failed: invalid format.");
      return;
    }
    await settingsStore.set({
      ...DEFAULT_SETTINGS,
      ...parsed.settings,
      groups: { ...DEFAULT_SETTINGS.groups, ...parsed.settings.groups }
    });
    await siteStore.setAllowlist(parsed.allowlist);
    await load();
    setStatus("Settings imported.");
  } catch {
    setStatus("Import failed: invalid JSON.");
  } finally {
    importFile.value = "";
  }
});

void load();
