import { DEFAULT_SETTINGS, PROTECTION_GROUPS } from "../shared/constants";
import { summarizeAllowlistCapacity } from "../shared/dnrAllowlist";
import { GlobalSettingsStore, parseSettingsExport } from "../shared/settingsStore";
import { sanitizeHostInput, SiteSettingsStore } from "../shared/siteSettingsStore";
import { getStorageStatus } from "../shared/storage";
import type { GlobalSettings, SettingsExport } from "../shared/types";

const settingsStore = new GlobalSettingsStore();
const siteStore = new SiteSettingsStore();

const saveStatus = document.querySelector<HTMLParagraphElement>("#save-status");
const allowlistEl = document.querySelector<HTMLTextAreaElement>("#allowlist");
const allowlistMetaEl = document.querySelector<HTMLParagraphElement>("#allowlist-meta");
const allowlistWarningEl = document.querySelector<HTMLParagraphElement>("#allowlist-warning");
const allowlistSearchEl = document.querySelector<HTMLInputElement>("#allowlist-search");
const allowlistSortEl = document.querySelector<HTMLSelectElement>("#allowlist-sort");
const allowlistItemsEl = document.querySelector<HTMLElement>("#allowlist-items");
const allowlistCapacityFillEl = document.querySelector<HTMLElement>("#allowlist-capacity-fill");
const saveAllowlistBtn = document.querySelector<HTMLButtonElement>("#save-allowlist");
const advancedModeEl = document.querySelector<HTMLInputElement>("#advanced-mode");
const exportBtn = document.querySelector<HTMLButtonElement>("#export-settings");
const importBtn = document.querySelector<HTMLButtonElement>("#import-settings");
const importFile = document.querySelector<HTMLInputElement>("#import-file");
const debugLink = document.querySelector<HTMLAnchorElement>("#debug-link");
const storageWarningEl = document.querySelector<HTMLParagraphElement>("#storage-warning");
const boundGroupListeners = new Set<string>();
let advancedModeListenerBound = false;
let allowlistHosts: string[] = [];
let allowlistSortMode: "newest" | "az" | "za" = "newest";

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

function renderAllowlistCapacity(hosts: string[]): void {
  const summary = summarizeAllowlistCapacity(hosts);
  if (allowlistMetaEl) {
    const hostLabel = summary.totalHosts === 1 ? "host" : "hosts";
    allowlistMetaEl.textContent =
      `${summary.totalHosts} saved ${hostLabel}. Browser-enforced coverage currently applies to ${summary.activeHosts}/${summary.totalHosts}.`;
  }
  if (allowlistCapacityFillEl) {
    const ratio = summary.maxHosts === 0 ? 0 : Math.min(1, summary.totalHosts / summary.maxHosts);
    allowlistCapacityFillEl.style.width = `${Math.max(2, Math.round(ratio * 100))}%`;
    allowlistCapacityFillEl.classList.toggle("warn", summary.overflowed);
  }

  if (!allowlistWarningEl) {
    return;
  }

  if (!summary.overflowed) {
    allowlistWarningEl.classList.add("hidden");
    allowlistWarningEl.textContent = "";
    return;
  }

  allowlistWarningEl.classList.remove("hidden");
  allowlistWarningEl.textContent =
    `${summary.pendingHosts} host${summary.pendingHosts === 1 ? "" : "s"} exceed the current ${summary.maxHosts}-host browser limit. CalmBlock keeps them saved locally, but only the first ${summary.activeHosts} apply until you trim the list.`;
}

function applyAllowlistState(hosts: string[]): void {
  allowlistHosts = [...hosts];
  if (allowlistEl) {
    allowlistEl.value = allowlistHosts.join("\n");
  }
  renderAllowlistCapacity(allowlistHosts);
  renderAllowlistItems();
}

function getSortedHosts(input: string[]): string[] {
  const hosts = [...input];
  if (allowlistSortMode === "az") {
    hosts.sort((left, right) => left.localeCompare(right));
    return hosts;
  }
  if (allowlistSortMode === "za") {
    hosts.sort((left, right) => right.localeCompare(left));
    return hosts;
  }
  return hosts;
}

function renderAllowlistItems(): void {
  if (!allowlistItemsEl) {
    return;
  }
  const query = (allowlistSearchEl?.value ?? "").trim().toLowerCase();
  const sorted = getSortedHosts(allowlistHosts);
  const filtered = query ? sorted.filter((host) => host.includes(query)) : sorted;

  allowlistItemsEl.innerHTML = "";
  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = query ? "No hosts match this search." : "No hosts saved yet.";
    allowlistItemsEl.append(empty);
    return;
  }

  for (const host of filtered) {
    const row = document.createElement("div");
    row.className = "opt-allowlist-item";
    const value = document.createElement("code");
    value.textContent = host;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "opt-icon-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      const next = allowlistHosts.filter((item) => item !== host);
      const saved = await siteStore.setAllowlist(next);
      applyAllowlistState(saved);
      setStatus(`Removed ${host} from allowlist.`);
    });
    row.append(value, removeBtn);
    allowlistItemsEl.append(row);
  }
}

function renderStorageWarning(): void {
  if (!storageWarningEl) {
    return;
  }
  const status = getStorageStatus();
  if (status.mode === "native" || !status.warning) {
    storageWarningEl.classList.add("hidden");
    storageWarningEl.textContent = "";
    return;
  }
  storageWarningEl.classList.remove("hidden");
  storageWarningEl.textContent = status.warning;
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

  applyAllowlistState(allowlist);
  renderStorageWarning();
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
  applyAllowlistState(saved);
  const allowlistSummary = summarizeAllowlistCapacity(saved);
  if (invalidCount > 0) {
    setStatus(`Allowlist saved. Ignored ${invalidCount} invalid entr${invalidCount === 1 ? "y" : "ies"}.`);
    return;
  }
  if (allowlistSummary.overflowed) {
    setStatus(
      `Allowlist saved. ${allowlistSummary.activeHosts} of ${allowlistSummary.totalHosts} hosts are currently active; ${allowlistSummary.pendingHosts} exceed the browser limit.`
    );
    return;
  }
  setStatus("Allowlist saved.");
});

allowlistSearchEl?.addEventListener("input", () => {
  renderAllowlistItems();
});

allowlistSortEl?.addEventListener("change", () => {
  const next = allowlistSortEl.value;
  if (next === "az" || next === "za" || next === "newest") {
    allowlistSortMode = next;
  }
  renderAllowlistItems();
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
