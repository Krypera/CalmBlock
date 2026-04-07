import { derivePopupState } from "../shared/popupState";
import { GlobalSettingsStore } from "../shared/settingsStore";
import { SiteSettingsStore } from "../shared/siteSettingsStore";
import type { PopupState } from "../shared/types";
import { getCurrentPageStats } from "./currentPageStats";

export class PopupStateService {
  constructor(
    private readonly settingsStore = new GlobalSettingsStore(),
    private readonly siteStore = new SiteSettingsStore()
  ) {}

  async getState(tabId: number, url: string): Promise<PopupState> {
    const host = safeHostFromUrl(url);
    const [settings, siteDisabled, stats] = await Promise.all([
      this.settingsStore.get(),
      host ? this.siteStore.isAllowlisted(host) : Promise.resolve(false),
      getCurrentPageStats(tabId)
    ]);

    return derivePopupState({
      host,
      global: settings,
      siteDisabled,
      blockedCount: stats.total,
      liveStatsAvailable: stats.liveStatsAvailable,
      liveStatsStatus: stats.status,
      blockedByCategory: stats.byCategory
    });
  }
}

export function safeHostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
