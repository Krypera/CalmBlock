import type { MessageRequest, MessageResponse } from "../shared/messages";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "../shared/constants";
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

async function broadcastProtectionStateToTab(tabId: number, url?: string): Promise<void> {
  const host = safeHostFromUrl(url ?? "");
  if (!host) {
    return;
  }
  const state = await getEffectiveSiteState(host);
  await webext?.tabs?.sendMessage?.(tabId, {
    type: "PROTECTION_STATE_CHANGED",
    effectiveEnabled: state.effectiveEnabled
  });
}

async function broadcastProtectionStateToAllTabs(): Promise<void> {
  const tabs = (await webext?.tabs?.query?.()) ?? [];
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url) {
        return;
      }
      await broadcastProtectionStateToTab(tab.id, tab.url);
    })
  );
}

async function syncBlockingState() {
  const [settings, allowlist] = await Promise.all([settingsStore.get(), siteStore.getAllowlist()]);
  if (!settings.enabled) {
    await webext?.declarativeNetRequest?.updateEnabledRulesets?.({
      enableRulesetIds: [],
      disableRulesetIds: ["ads", "trackers", "annoyances", "strict"]
    });
  } else {
    await rulesetManager.syncGroupRules(settings.groups);
  }
  await rulesetManager.syncAllowlistRules(allowlist);
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
  if (
    changes[STORAGE_KEYS.settings] ||
    changes[STORAGE_KEYS.allowlist] ||
    changes[LEGACY_STORAGE_KEYS.settings] ||
    changes[LEGACY_STORAGE_KEYS.allowlist]
  ) {
    await syncBlockingState();
    await broadcastProtectionStateToAllTabs();
  }
});

webext?.runtime?.onMessage?.addListener(async (message: MessageRequest): Promise<MessageResponse> => {
  try {
    await ensureInitialized();
    if (message.type === "GET_POPUP_STATE") {
      const state = await popupStateService.getState(message.tabId, message.url);
      return { ok: true, state };
    }

    if (message.type === "TOGGLE_GLOBAL") {
      await settingsStore.update({ enabled: message.enabled });
      await syncBlockingState();
      await broadcastProtectionStateToAllTabs();
      return { ok: true };
    }

    if (message.type === "TOGGLE_SITE") {
      await siteStore.setHostEnabled(message.host, message.enabled);
      await syncBlockingState();
      await broadcastProtectionStateToAllTabs();
      return { ok: true };
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
});

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
    const siteDisabled = await siteStore.isAllowlisted(host);
    const badgeText = siteDisabled ? "off" : "";
    await webext?.action?.setBadgeText?.({ tabId: tab.id, text: badgeText });
    await webext?.action?.setBadgeBackgroundColor?.({
      tabId: tab.id,
      color: siteDisabled ? "#8fa6bf" : "#6db1ff"
    });
    await broadcastProtectionStateToTab(tab.id, tab.url);
  }
);
