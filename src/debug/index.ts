import { GlobalSettingsStore } from "../shared/settingsStore";
import { SiteSettingsStore } from "../shared/siteSettingsStore";
import { BrowserAdapter } from "../shared/browserAdapter";
import { summarizeAllowlistCapacity } from "../shared/dnrAllowlist";
import { PermissionManager } from "../shared/permissionManager";
import { getStorageStatus } from "../shared/storage";
import { buildTriageBundle } from "../shared/triageBundle";
import { webext } from "../shared/webext";
import { buildShareSafeDiagnostics } from "./diagnostics";

const output = document.querySelector<HTMLElement>("#debug-output");
const capabilityList = document.querySelector<HTMLElement>("#debug-capabilities");
const statusList = document.querySelector<HTMLElement>("#debug-status");
const lockCard = document.querySelector<HTMLElement>("#debug-lock");
const lockCopy = document.querySelector<HTMLElement>("#debug-lock-copy");
const debugPanel = document.querySelector<HTMLElement>("#debug-panel");
const shareSafeToggle = document.querySelector<HTMLInputElement>("#debug-redact");
const copyTriageBtn = document.querySelector<HTMLButtonElement>("#copy-triage");
const downloadDiagnosticsBtn = document.querySelector<HTMLButtonElement>("#download-diagnostics");
const settingsStore = new GlobalSettingsStore();
const siteStore = new SiteSettingsStore();
const permissionManager = new PermissionManager();
let currentPayload: unknown = null;
let currentTriageBundle: unknown = null;

async function render() {
  const settings = await settingsStore.get();
  if (!settings.advancedMode) {
    lockCard?.classList.remove("hidden");
    debugPanel?.classList.add("hidden");
    if (lockCopy) {
      lockCopy.textContent =
        "Advanced mode is off. Open settings, turn on advanced mode, then reload this debug page.";
    }
    if (output) {
      output.textContent = "";
    }
    return;
  }

  lockCard?.classList.add("hidden");
  debugPanel?.classList.remove("hidden");

  const [allowlist, dynamicRules, enabledRulesets, tabs, feedbackCapability] = await Promise.all([
    siteStore.getAllowlist(),
    webext?.declarativeNetRequest?.getDynamicRules?.() ?? Promise.resolve([]),
    webext?.declarativeNetRequest?.getEnabledRulesets?.() ?? Promise.resolve([]),
    webext?.tabs?.query?.({ active: true, currentWindow: true }) ?? Promise.resolve([]),
    permissionManager.getFeedbackCapability()
  ]);
  const activeTab = tabs[0];
  const manifestVersion = webext?.runtime?.getManifest?.().version ?? null;
  const capabilities = BrowserAdapter.getCapabilities();
  const storageStatus = getStorageStatus();
  const allowlistSummary = summarizeAllowlistCapacity(allowlist);
  const activeUrl = activeTab?.url ?? null;
  const activeHost = (() => {
    if (!activeUrl) {
      return null;
    }
    try {
      return new URL(activeUrl).hostname;
    } catch {
      return null;
    }
  })();

  const generatedAt = new Date().toISOString();
  const runtimeInfo = BrowserAdapter.getRuntimeInfo();
  const compatibilityMode = BrowserAdapter.getCompatibilityMode(runtimeInfo.target);
  const triageBundle = buildTriageBundle({
    generatedAt,
    browserTarget: runtimeInfo.target,
    browserVersion: runtimeInfo.browserVersion,
    compatibilityMode,
    extensionVersion: manifestVersion,
    activeHost,
    globalEnabled: settings.enabled,
    groups: settings.groups,
    allowlist,
    enabledRulesets,
    dynamicRulesCount: dynamicRules.length
  });

  const payload = {
    generatedAt,
    target: runtimeInfo.target,
    browserVersion: runtimeInfo.browserVersion,
    compatibilityMode,
    capabilities,
    storageStatus,
    feedbackCapability,
    allowlistSummary,
    activeTab: {
      url: activeUrl,
      host: activeHost
    },
    settings: {
      enabled: settings.enabled,
      advancedMode: settings.advancedMode,
      groups: settings.groups
    },
    allowlist,
    dynamicRulesCount: dynamicRules.length,
    enabledRulesets,
    triageBundle
  };
  currentPayload = payload;
  currentTriageBundle = triageBundle;

  renderCapabilityList(capabilities, feedbackCapability);
  renderStatusList(storageStatus.warning, allowlistSummary);
  if (output) {
    output.textContent = JSON.stringify(payload, null, 2);
  }
}

void render();
bindDebugActions();

function renderCapabilityList(
  capabilities: ReturnType<typeof BrowserAdapter.getCapabilities>,
  feedbackCapability: Awaited<ReturnType<PermissionManager["getFeedbackCapability"]>>
): void {
  if (!capabilityList) {
    return;
  }
  capabilityList.innerHTML = "";
  const items = [
    `Storage local API: ${formatFlag(capabilities.storageLocal)}`,
    `DNR static rules: ${formatFlag(capabilities.declarativeNetRequest)}`,
    `DNR dynamic rules: ${formatFlag(capabilities.dynamicRules)}`,
    `Matched-rule telemetry API: ${formatFlag(capabilities.matchedRuleTelemetry)}`,
    `Feedback permission query: ${formatFlag(capabilities.optionalPermissionsQuery)}`,
    `Feedback permission request: ${formatFlag(capabilities.optionalPermissionsRequest)}`,
    `Feedback permission granted: ${formatNullablePermission(feedbackCapability.permissionGranted)}`
  ];
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    capabilityList.append(li);
  }
}

function renderStatusList(
  storageWarning: string | null,
  allowlistSummary: ReturnType<typeof summarizeAllowlistCapacity>
): void {
  if (!statusList) {
    return;
  }
  statusList.innerHTML = "";
  const warning = allowlistSummary.overflowed
    ? `${allowlistSummary.pendingHosts} allowlist hosts exceed ${allowlistSummary.maxHosts} active-host capacity.`
    : "Allowlist capacity is within active DNR limits.";

  const items = [
    `Storage mode: ${storageWarning ? "memory-fallback" : "native"}`,
    storageWarning ? `Storage warning: ${storageWarning}` : "Storage warning: none",
    `Allowlist: ${allowlistSummary.activeHosts}/${allowlistSummary.totalHosts} hosts active`,
    `Allowlist overflow: ${warning}`
  ];
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    statusList.append(li);
  }
}

function formatFlag(value: boolean): string {
  return value ? "available" : "unavailable";
}

function formatNullablePermission(value: boolean | null): string {
  if (value === null) {
    return "unknown";
  }
  return value ? "granted" : "not granted";
}

function bindDebugActions(): void {
  copyTriageBtn?.addEventListener("click", async () => {
    if (!currentTriageBundle) {
      return;
    }
    const payload = shareSafeToggle?.checked
      ? buildShareSafeDiagnostics(currentTriageBundle)
      : currentTriageBundle;
    await copyToClipboard(JSON.stringify(payload, null, 2));
  });

  downloadDiagnosticsBtn?.addEventListener("click", () => {
    if (!currentPayload) {
      return;
    }
    const payload = shareSafeToggle?.checked
      ? buildShareSafeDiagnostics(currentPayload)
      : currentPayload;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "calmblock-diagnostics.json";
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.className = "hidden";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
