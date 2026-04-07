import type { GlobalSettings, PopupState, ProtectionGroup } from "./types";
import { GROUP_LABELS, PROTECTION_GROUPS } from "./constants";

export function buildProtectionSummary(settings: GlobalSettings): string {
  if (!settings.enabled) {
    return "Global protection is currently off.";
  }
  const active = PROTECTION_GROUPS.filter((group) => settings.groups[group]);
  if (!active.length) {
    return "No protection groups are enabled.";
  }
  if (active.length === PROTECTION_GROUPS.length) {
    return "All core protections are active.";
  }
  const labels = active.map((group) => GROUP_LABELS[group]).join(", ");
  return `Active: ${labels}.`;
}

export function defaultCategoryCounters(): Record<ProtectionGroup, number> {
  return {
    ads: 0,
    trackers: 0,
    annoyances: 0,
    strict: 0
  };
}

export function derivePopupState(input: {
  host: string | null;
  global: GlobalSettings;
  siteDisabled: boolean;
  blockedCount: number | null;
  liveStatsAvailable?: boolean;
  blockedByCategory?: Record<ProtectionGroup, number>;
}): PopupState {
  const siteDisabled = input.siteDisabled;
  const siteEnabled = !siteDisabled;
  const effectiveProtectionEnabled = input.global.enabled && siteEnabled;

  return {
    host: input.host,
    globalEnabled: input.global.enabled,
    siteEnabled,
    siteDisabled,
    effectiveProtectionEnabled,
    protectedSummary: buildProtectionSummary(input.global),
    blockedCount: input.blockedCount,
    liveStatsAvailable: input.liveStatsAvailable ?? input.blockedCount !== null,
    blockedByCategory: input.blockedByCategory ?? defaultCategoryCounters()
  };
}
