import { GlobalSettingsStore } from "../shared/settingsStore";
import { SiteSettingsStore } from "../shared/siteSettingsStore";
import { BrowserAdapter } from "../shared/browserAdapter";
import { webext } from "../shared/webext";

const output = document.querySelector<HTMLElement>("#debug-output");
const lockCard = document.querySelector<HTMLElement>("#debug-lock");
const debugPanel = document.querySelector<HTMLElement>("#debug-panel");
const settingsStore = new GlobalSettingsStore();
const siteStore = new SiteSettingsStore();

async function render() {
  const settings = await settingsStore.get();
  if (!settings.advancedMode) {
    lockCard?.classList.remove("hidden");
    debugPanel?.classList.add("hidden");
    if (output) {
      output.textContent = "";
    }
    return;
  }

  lockCard?.classList.add("hidden");
  debugPanel?.classList.remove("hidden");

  const [allowlist, dynamicRules, enabledRulesets] = await Promise.all([
    siteStore.getAllowlist(),
    webext?.declarativeNetRequest?.getDynamicRules?.() ?? Promise.resolve([]),
    webext?.declarativeNetRequest?.getEnabledRulesets?.() ?? Promise.resolve([])
  ]);

  const payload = {
    target: BrowserAdapter.detectTarget(),
    settings,
    allowlist,
    dynamicRulesCount: dynamicRules.length,
    enabledRulesets
  };

  if (output) {
    output.textContent = JSON.stringify(payload, null, 2);
  }
}

void render();
