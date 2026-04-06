import type { GlobalSettings, ProtectionGroup } from "./types";
import type { DnrResourceType } from "./webext";

export const STORAGE_KEYS = {
  settings: "calmblock.settings",
  allowlist: "calmblock.allowlist"
} as const;

export const LEGACY_STORAGE_KEYS = {
  settings: "quietblock.settings",
  allowlist: "quietblock.allowlist"
} as const;

export const DEFAULT_SETTINGS: GlobalSettings = {
  enabled: true,
  advancedMode: false,
  groups: {
    ads: true,
    trackers: true,
    annoyances: true,
    strict: false
  }
};

export const PROTECTION_GROUPS: ProtectionGroup[] = [
  "ads",
  "trackers",
  "annoyances",
  "strict"
];

export const GROUP_LABELS: Record<ProtectionGroup, string> = {
  ads: "Ads",
  trackers: "Trackers",
  annoyances: "Annoyances",
  strict: "Strict Privacy"
};

export const ALLOWLIST_RULE_START = 100_000;

export const DNR_RESOURCE_TYPES: DnrResourceType[] = [
  "main_frame",
  "sub_frame",
  "script",
  "stylesheet",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "media",
  "websocket",
  "other"
];
