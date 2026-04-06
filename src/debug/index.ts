import { GlobalSettingsStore } from "../shared/settingsStore";
import { SiteSettingsStore } from "../shared/siteSettingsStore";
import { BrowserAdapter } from "../shared/browserAdapter";
import { webext } from "../shared/webext";

const output = document.querySelector<HTMLElement>("#debug-output");
const settingsStore = new GlobalSettingsStore();
const siteStore = new SiteSettingsStore();

async function render() {
  const [settings, allowlist, dynamicRules, enabledRulesets] = await Promise.all([
    settingsStore.get(),
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
