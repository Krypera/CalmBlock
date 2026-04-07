export type ProtectionGroup = "ads" | "trackers" | "annoyances" | "strict";

export interface GroupSettings {
  ads: boolean;
  trackers: boolean;
  annoyances: boolean;
  strict: boolean;
}

export interface GlobalSettings {
  enabled: boolean;
  advancedMode: boolean;
  groups: GroupSettings;
}

export interface PopupState {
  host: string | null;
  globalEnabled: boolean;
  siteEnabled: boolean;
  siteDisabled: boolean;
  effectiveProtectionEnabled: boolean;
  protectedSummary: string;
  blockedCount: number | null;
  liveStatsAvailable: boolean;
  blockedByCategory: Record<ProtectionGroup, number>;
  reloadRequired: boolean;
}

export interface SettingsExport {
  version: 1;
  settings: GlobalSettings;
  allowlist: string[];
}
