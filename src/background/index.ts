import type { ApplySummary, MessageRequest, MessageResponse } from "../shared/messages";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "../shared/constants";
import type { AllowlistCapacitySummary } from "../shared/dnrAllowlist";
import { webext } from "../shared/webext";
import { GlobalSettingsStore } from "../shared/settingsStore";
import { SiteSettingsStore } from "../shared/siteSettingsStore";
import { RulesetManager } from "./rulesetManager";
import { PopupStateService, safeHostFromUrl } from "./popupStateService";

const settingsStore = new GlobalSettingsStore();
const siteStore = new SiteSettingsStore();
const rulesetManager = new RulesetManager();
const popupStateService = new PopupStateService(settingsStore, siteStore);
let startupInitPromise: Promise<void> | null = null;
let localMutationDepth = 0;

async function getEffectiveSiteState(host: string): Promise<{
  globalEnabled: boolean;
  siteDisabled: boolean;
  effectiveEnabled: boolean;
}> {
  const [settings, siteDisabled] = await Promise.all([
    settingsStore.get(),
    siteStore.isAllowlisted(host)
  ]);
  return {
    globalEnabled: settings.enabled,
    siteDisabled,
    effectiveEnabled: settings.enabled && !siteDisabled
  };
}

async function applyBadgeForTab(tabId: number, host: string): Promise<void> {
  const state = await getEffectiveSiteState(host);
  await webext?.action?.setBadgeText?.({
    tabId,
    text: state.effectiveEnabled ? "" : "off"
  });
  await webext?.action?.setBadgeBackgroundColor?.({
    tabId,
    color: state.effectiveEnabled ? "#6db1ff" : "#8fa6bf"
  });
}

async function broadcastProtectionStateToTab(tabId: number, url?: string): Promise<void> {
  const host = safeHostFromUrl(url ?? "");
  if (!host) {
    return;
  }
  const state = await getEffectiveSiteState(host);
  await applyBadgeForTab(tabId, host);
  try {
    await webext?.tabs?.sendMessage?.(tabId, {
      type: "PROTECTION_STATE_CHANGED",
      effectiveEnabled: state.effectiveEnabled
    });
  } catch (error) {
    if (isMissingReceiverError(error)) {
      return;
    }
    throw error;
  }
}

async function broadcastProtectionStateToAllTabs(): Promise<void> {
  const tabs = (await webext?.tabs?.query?.({})) ?? [];
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url) {
        return;
      }
      await broadcastProtectionStateToTab(tab.id, tab.url);
    })
  );
}

async function syncBlockingState(): Promise<{
  allowlistSummary: AllowlistCapacitySummary;
}> {
  const [settings, allowlist] = await Promise.all([settingsStore.get(), siteStore.getAllowlist()]);
  if (!settings.enabled) {
    await webext?.declarativeNetRequest?.updateEnabledRulesets?.({
      enableRulesetIds: [],
      disableRulesetIds: ["ads", "trackers", "annoyances", "strict"]
    });
  } else {
    await rulesetManager.syncGroupRules(settings.groups);
  }
  const allowlistSummary = await rulesetManager.syncAllowlistRules(allowlist);
  return { allowlistSummary };
}

async function applyBlockingAndBroadcast(): Promise<{
  allowlistSummary: AllowlistCapacitySummary;
}> {
  const syncResult = await syncBlockingState();
  await broadcastProtectionStateToAllTabs();
  return syncResult;
}

async function runAsLocalMutation(task: () => Promise<void>): Promise<void> {
  localMutationDepth += 1;
  try {
    await task();
  } finally {
    localMutationDepth = Math.max(0, localMutationDepth - 1);
  }
}

async function migrateLegacyStorageKeys(): Promise<void> {
  const local = webext?.storage?.local;
  if (!local?.get || !local?.set) {
    return;
  }

  const existing = await local.get([
    STORAGE_KEYS.settings,
    STORAGE_KEYS.allowlist,
    LEGACY_STORAGE_KEYS.settings,
    LEGACY_STORAGE_KEYS.allowlist
  ]);

  const updates: Record<string, unknown> = {};
  const hasLegacySettings = existing[LEGACY_STORAGE_KEYS.settings] !== undefined;
  const hasLegacyAllowlist = existing[LEGACY_STORAGE_KEYS.allowlist] !== undefined;
  const hasAnyLegacyData = hasLegacySettings || hasLegacyAllowlist;
  const hasAnyNewData =
    existing[STORAGE_KEYS.settings] !== undefined || existing[STORAGE_KEYS.allowlist] !== undefined;

  if (
    existing[STORAGE_KEYS.settings] === undefined &&
    existing[LEGACY_STORAGE_KEYS.settings] !== undefined
  ) {
    updates[STORAGE_KEYS.settings] = existing[LEGACY_STORAGE_KEYS.settings];
  }
  if (
    existing[STORAGE_KEYS.allowlist] === undefined &&
    existing[LEGACY_STORAGE_KEYS.allowlist] !== undefined
  ) {
    updates[STORAGE_KEYS.allowlist] = existing[LEGACY_STORAGE_KEYS.allowlist];
  }

  if (Object.keys(updates).length > 0) {
    await local.set(updates);
    if (local.remove) {
      await local.remove([LEGACY_STORAGE_KEYS.settings, LEGACY_STORAGE_KEYS.allowlist]);
    }
    return;
  }

  if (hasAnyLegacyData && hasAnyNewData && local.remove) {
    await local.remove([LEGACY_STORAGE_KEYS.settings, LEGACY_STORAGE_KEYS.allowlist]);
  }
}

async function initializeBlockingState(): Promise<void> {
  await migrateLegacyStorageKeys();
  const current = await settingsStore.get();
  await settingsStore.set(current);
  await syncBlockingState();
}

function ensureInitialized(): Promise<void> {
  startupInitPromise ??= initializeBlockingState();
  return startupInitPromise;
}

void ensureInitialized();

webext?.runtime?.onInstalled?.addListener(async () => {
  startupInitPromise = null;
  await ensureInitialized();
});

webext?.storage?.onChanged?.addListener(async (changes: Record<string, unknown>, areaName: string) => {
  await ensureInitialized();
  if (areaName !== "local") {
    return;
  }
  if (localMutationDepth > 0) {
    return;
  }
  if (
    changes[STORAGE_KEYS.settings] ||
    changes[STORAGE_KEYS.allowlist] ||
    changes[LEGACY_STORAGE_KEYS.settings] ||
    changes[LEGACY_STORAGE_KEYS.allowlist]
  ) {
    await applyBlockingAndBroadcast();
  }
});

async function handleRuntimeMessage(message: MessageRequest): Promise<MessageResponse> {
  try {
    await ensureInitialized();
    if (message.type === "GET_POPUP_STATE") {
      const state = await popupStateService.getState(message.tabId, message.url);
      return { ok: true, state };
    }

    if (message.type === "TOGGLE_GLOBAL") {
      let allowlistSummary: AllowlistCapacitySummary | undefined;
      await runAsLocalMutation(async () => {
        await settingsStore.update({ enabled: message.enabled });
        ({ allowlistSummary } = await applyBlockingAndBroadcast());
      });
      return {
        ok: true,
        applyMode: "instant",
        applySummary: buildGlobalApplySummary(allowlistSummary)
      };
    }

    if (message.type === "TOGGLE_SITE") {
      let allowlistSummary: AllowlistCapacitySummary | undefined;
      await runAsLocalMutation(async () => {
        await siteStore.setHostEnabled(message.host, message.enabled);
        ({ allowlistSummary } = await applyBlockingAndBroadcast());
      });
      return {
        ok: true,
        applyMode: "reload-recommended",
        applySummary: buildSiteApplySummary(allowlistSummary)
      };
    }

    if (message.type === "IS_SITE_DISABLED") {
      const disabled = await siteStore.isAllowlisted(message.host);
      return { ok: true, disabled };
    }

    if (message.type === "GET_EFFECTIVE_SITE_STATE") {
      const state = await getEffectiveSiteState(message.host);
      return { ok: true, effectiveEnabled: state.effectiveEnabled };
    }

    return { ok: false, error: "Unknown message type" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

webext?.runtime?.onMessage?.addListener(
  (
    message: unknown,
    _sender?: unknown,
    sendResponse?: (response: MessageResponse) => void
  ): Promise<MessageResponse> | true => {
    const typedMessage = message as MessageRequest;
    if (typeof sendResponse === "function") {
      void handleRuntimeMessage(typedMessage).then(sendResponse);
      return true;
    }
    return handleRuntimeMessage(typedMessage);
  }
);

webext?.tabs?.onUpdated?.addListener(
  async (_tabId: number, changeInfo: { status?: string }, tab: { id?: number; url?: string }) => {
    await ensureInitialized();
    if (changeInfo.status !== "complete" || !tab.id || !tab.url) {
      return;
    }
    const host = safeHostFromUrl(tab.url);
    if (!host) {
      return;
    }
    await broadcastProtectionStateToTab(tab.id, tab.url);
  }
);

function buildGlobalApplySummary(allowlistSummary?: AllowlistCapacitySummary): ApplySummary {
  return {
    immediate: [
      "Popup state, badge state, and content cleanup update immediately.",
      "New requests started after this change use the updated global policy."
    ],
    afterReload: [],
    warning: formatAllowlistOverflowWarning(allowlistSummary)
  };
}

function buildSiteApplySummary(allowlistSummary?: AllowlistCapacitySummary): ApplySummary {
  return {
    immediate: [
      "Popup state, badge state, and page cleanup update immediately for this host.",
      "New requests created after this change use the updated site policy."
    ],
    afterReload: [
      "Requests and resources that were already loaded on this tab keep their previous network decision until reload.",
      "Per-page counters fully reflect the new site state after reload or a fresh navigation."
    ],
    warning: formatAllowlistOverflowWarning(allowlistSummary)
  };
}

function formatAllowlistOverflowWarning(
  allowlistSummary?: AllowlistCapacitySummary
): string | undefined {
  if (!allowlistSummary?.overflowed) {
    return undefined;
  }
  const overflowLabel = allowlistSummary.pendingHosts === 1 ? "host is" : "hosts are";
  return `${allowlistSummary.pendingHosts} allowlist ${overflowLabel} beyond the current ${allowlistSummary.maxHosts}-host limit (${allowlistSummary.source}). Newly paused sites stay prioritized, but older overflow entries will not apply until the list is trimmed.`;
}

function isMissingReceiverError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("receiving end does not exist") ||
    message.includes("could not establish connection")
  );
}
