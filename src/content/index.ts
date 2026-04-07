import { AnnoyanceEngine } from "./annoyanceEngine";
import { CosmeticEngine } from "./cosmeticEngine";
import type { MessageResponse } from "../shared/messages";
import { webext } from "../shared/webext";

const cosmeticEngine = new CosmeticEngine();
const annoyanceEngine = new AnnoyanceEngine();
let enginesActive = false;

function getHost(): string {
  return window.location.hostname;
}

function applyEffectiveState(enabled: boolean): void {
  if (enabled && !enginesActive) {
    cosmeticEngine.apply();
    annoyanceEngine.start();
    enginesActive = true;
    return;
  }
  if (!enabled && enginesActive) {
    cosmeticEngine.clear();
    annoyanceEngine.stop();
    enginesActive = false;
  }
}

async function isEffectiveProtectionEnabled(host: string): Promise<boolean> {
  const response = (await webext?.runtime?.sendMessage?.({
    type: "GET_EFFECTIVE_SITE_STATE",
    host
  })) as MessageResponse | undefined;
  if (!response) {
    return false;
  }
  if (!response.ok) {
    return false;
  }
  return !!response.effectiveEnabled;
}

async function boot() {
  const host = getHost();
  const enabled = await isEffectiveProtectionEnabled(host);
  applyEffectiveState(enabled);
}

webext?.runtime?.onMessage?.addListener((message: { type: string; effectiveEnabled?: boolean }) => {
  if (message.type !== "PROTECTION_STATE_CHANGED") {
    return;
  }
  applyEffectiveState(!!message.effectiveEnabled);
});

void boot();
