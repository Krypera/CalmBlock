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
  }

  if (local.remove) {
    await local.remove([LEGACY_STORAGE_KEYS.settings, LEGACY_STORAGE_KEYS.allowlist]);
  }
}

void migrateLegacyStorageKeys().then(syncBlockingState);

webext?.runtime?.onInstalled?.addListener(async () => {
  const current = await settingsStore.get();
  await settingsStore.set(current);
  await migrateLegacyStorageKeys();
  await syncBlockingState();
});

webext?.storage?.onChanged?.addListener(async (changes: Record<string, unknown>, areaName: string) => {
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
  }
});

webext?.runtime?.onMessage?.addListener(async (message: MessageRequest): Promise<MessageResponse> => {
  try {
    if (message.type === "GET_POPUP_STATE") {
      const state = await popupStateService.getState(message.tabId, message.url);
      return { ok: true, state };
    }

    if (message.type === "TOGGLE_GLOBAL") {
      await settingsStore.update({ enabled: message.enabled });
      await syncBlockingState();
      return { ok: true };
    }

    if (message.type === "TOGGLE_SITE") {
      await siteStore.setHostEnabled(message.host, message.enabled);
      await syncBlockingState();
      await webext?.tabs?.sendMessage?.(message.tabId, {
        type: "SITE_STATE_CHANGED",
        enabled: message.enabled
      });
      return { ok: true };
    }

    if (message.type === "IS_SITE_DISABLED") {
      const disabled = await siteStore.isAllowlisted(message.host);
      return { ok: true, disabled };
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
  }
);
