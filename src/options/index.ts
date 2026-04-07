import { DEFAULT_SETTINGS, PROTECTION_GROUPS } from "../shared/constants";
import { GlobalSettingsStore, parseSettingsExport } from "../shared/settingsStore";
import { sanitizeHostInput, SiteSettingsStore } from "../shared/siteSettingsStore";
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
const boundGroupListeners = new Set<string>();
let advancedModeListenerBound = false;

function setStatus(text: string) {
  if (saveStatus) {
    saveStatus.textContent = text;
  }
}

function setAdvancedControlsEnabled(enabled: boolean): void {
  if (exportBtn) {
    exportBtn.disabled = !enabled;
  }
  if (importBtn) {
    importBtn.disabled = !enabled;
  }
  debugLink?.classList.toggle("hidden", !enabled);
}

function parseAllowlistInput(value: string): { hosts: string[]; invalidCount: number } {
  let invalidCount = 0;
  const hosts = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const host = sanitizeHostInput(line);
      if (!host) {
        invalidCount += 1;
      }
      return host;
    })
    .filter((host): host is string => !!host);

  return { hosts, invalidCount };
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
    if (!boundGroupListeners.has(group)) {
      boundGroupListeners.add(group);
      el.addEventListener("change", async () => {
        const next = await settingsStore.get();
        next.groups[group] = el.checked;
        await settingsStore.set(next);
        setStatus(`Saved ${group} group state.`);
      });
    }
  }

  if (allowlistEl) {
    allowlistEl.value = allowlist.join("\n");
  }
  if (advancedModeEl) {
    advancedModeEl.checked = settings.advancedMode;
    setAdvancedControlsEnabled(settings.advancedMode);
    if (!advancedModeListenerBound) {
      advancedModeListenerBound = true;
      advancedModeEl.addEventListener("change", async () => {
        await settingsStore.update({ advancedMode: advancedModeEl.checked });
        setAdvancedControlsEnabled(advancedModeEl.checked);
        setStatus("Saved advanced mode setting.");
      });
    }
  }
}

saveAllowlistBtn?.addEventListener("click", async () => {
  if (!allowlistEl) {
    return;
  }
  const { hosts, invalidCount } = parseAllowlistInput(allowlistEl.value);
  const saved = await siteStore.setAllowlist(hosts);
  allowlistEl.value = saved.join("\n");
  if (invalidCount > 0) {
    setStatus(`Allowlist saved. Ignored ${invalidCount} invalid entr${invalidCount === 1 ? "y" : "ies"}.`);
    return;
  }
  setStatus("Allowlist saved.");
});

exportBtn?.addEventListener("click", async () => {
  if (exportBtn.disabled) {
    setStatus("Enable advanced mode to export settings.");
    return;
  }
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
  if (importBtn?.disabled) {
    setStatus("Enable advanced mode to import settings.");
    return;
  }
  importFile?.click();
});

importFile?.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) {
    return;
  }

  const raw = await file.text();
  const parsed = parseSettingsExport(raw);
  if (!parsed) {
    setStatus("Import failed: invalid or unsupported file.");
    importFile.value = "";
    return;
  }
  try {
    await settingsStore.set({
      ...DEFAULT_SETTINGS,
      ...parsed.settings,
      groups: { ...DEFAULT_SETTINGS.groups, ...parsed.settings.groups }
    });
    await siteStore.setAllowlist(parsed.allowlist);
    await load();
    setStatus("Settings imported.");
  } catch {
    setStatus("Import failed: could not persist settings.");
  } finally {
    importFile.value = "";
  }
});

void load();
