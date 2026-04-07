import { AnnoyanceEngine } from "./annoyanceEngine";
import { CosmeticEngine } from "./cosmeticEngine";
import type { MessageResponse } from "../shared/messages";
import { webext } from "../shared/webext";

const cosmeticEngine = new CosmeticEngine();
const annoyanceEngine = new AnnoyanceEngine();
let enginesActive = false;
let syncAttempt = 0;
let scheduledResyncTimer: number | null = null;
let pendingDeferredResync = false;

const MAX_BOOT_ATTEMPTS = 4;
const RESYNC_DELAYS_MS = [250, 750, 1500, 3000];

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
  try {
    const response = (await webext?.runtime?.sendMessage?.({
      type: "GET_EFFECTIVE_SITE_STATE",
      host
    })) as MessageResponse | undefined;
    if (!response || !response.ok) {
      throw new Error("missing-effective-state-response");
    }
    return !!response.effectiveEnabled;
  } catch {
    throw new Error("background-state-unavailable");
  }
}

function scheduleRetry(delayMs: number): void {
  if (scheduledResyncTimer !== null) {
    window.clearTimeout(scheduledResyncTimer);
  }
  scheduledResyncTimer = window.setTimeout(() => {
    scheduledResyncTimer = null;
    void syncFromBackground("retry");
  }, delayMs);
}

function scheduleDeferredResync(): void {
  pendingDeferredResync = true;
}

function consumeDeferredResync(reason: "deferred"): void {
  if (!pendingDeferredResync) {
    return;
  }
  pendingDeferredResync = false;
  void syncFromBackground(reason);
}

async function syncFromBackground(reason: "boot" | "retry" | "deferred"): Promise<void> {
  const host = getHost();
  try {
    const enabled = await isEffectiveProtectionEnabled(host);
    syncAttempt = 0;
    applyEffectiveState(enabled);
  } catch {
    syncAttempt += 1;
    const retryIndex = Math.min(syncAttempt - 1, RESYNC_DELAYS_MS.length - 1);
    if (syncAttempt <= MAX_BOOT_ATTEMPTS) {
      scheduleRetry(RESYNC_DELAYS_MS[retryIndex] ?? RESYNC_DELAYS_MS[RESYNC_DELAYS_MS.length - 1]);
      return;
    }
    scheduleDeferredResync();
    if (reason !== "deferred") {
      applyEffectiveState(false);
    }
  }
}

webext?.runtime?.onMessage?.addListener((message: unknown) => {
  const typedMessage = message as { type?: string; effectiveEnabled?: boolean };
  if (typedMessage.type !== "PROTECTION_STATE_CHANGED") {
    return;
  }
  syncAttempt = 0;
  pendingDeferredResync = false;
  applyEffectiveState(!!typedMessage.effectiveEnabled);
});

window.addEventListener("focus", () => consumeDeferredResync("deferred"));
window.addEventListener("online", () => consumeDeferredResync("deferred"));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    consumeDeferredResync("deferred");
  }
});

void syncFromBackground("boot");
