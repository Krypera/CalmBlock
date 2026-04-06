import { AnnoyanceEngine } from "./annoyanceEngine";
import { CosmeticEngine } from "./cosmeticEngine";
import type { MessageResponse } from "../shared/messages";
import { webext } from "../shared/webext";

const cosmeticEngine = new CosmeticEngine();
const annoyanceEngine = new AnnoyanceEngine();

function getHost(): string {
  return window.location.hostname;
}

async function isSiteEnabled(host: string): Promise<boolean> {
  const response = (await webext?.runtime?.sendMessage?.({
    type: "IS_SITE_DISABLED",
    host
  })) as MessageResponse | undefined;
  if (!response) {
    return true;
  }
  if (!response.ok) {
    return true;
  }
  return !response.disabled;
}

async function boot() {
  const host = getHost();
  const enabled = await isSiteEnabled(host);
  if (!enabled) {
    return;
  }
  cosmeticEngine.apply();
  annoyanceEngine.start();
}

webext?.runtime?.onMessage?.addListener((message: { type: string; enabled: boolean }) => {
  if (message.type !== "SITE_STATE_CHANGED") {
    return;
  }
  if (message.enabled) {
    cosmeticEngine.apply();
    annoyanceEngine.start();
    return;
  }
  cosmeticEngine.clear();
  annoyanceEngine.stop();
});

void boot();
