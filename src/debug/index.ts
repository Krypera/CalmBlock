import { GlobalSettingsStore } from "../shared/settingsStore";
import { SiteSettingsStore } from "../shared/siteSettingsStore";
import { BrowserAdapter } from "../shared/browserAdapter";
import { buildTriageBundle } from "../shared/triageBundle";
import { webext } from "../shared/webext";

const output = document.querySelector<HTMLElement>("#debug-output");
const lockCard = document.querySelector<HTMLElement>("#debug-lock");
const lockCopy = document.querySelector<HTMLElement>("#debug-lock-copy");
const debugPanel = document.querySelector<HTMLElement>("#debug-panel");
const settingsStore = new GlobalSettingsStore();
const siteStore = new SiteSettingsStore();

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

  const [allowlist, dynamicRules, enabledRulesets, tabs] = await Promise.all([
    siteStore.getAllowlist(),
    webext?.declarativeNetRequest?.getDynamicRules?.() ?? Promise.resolve([]),
    webext?.declarativeNetRequest?.getEnabledRulesets?.() ?? Promise.resolve([]),
    webext?.tabs?.query?.({ active: true, currentWindow: true }) ?? Promise.resolve([])
  ]);
  const activeTab = tabs[0];
  const manifestVersion = webext?.runtime?.getManifest?.().version ?? null;
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
  const target = BrowserAdapter.detectTarget();
  const triageBundle = buildTriageBundle({
    generatedAt,
    browserTarget: target,
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
    target,
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

  if (output) {
    output.textContent = JSON.stringify(payload, null, 2);
  }
}

void render();
