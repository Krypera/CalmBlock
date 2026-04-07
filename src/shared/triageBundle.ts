import type { BrowserTarget } from "./browserAdapter";
import type { GroupSettings } from "./types";

export const TRIAGE_BUNDLE_SCHEMA = "calmblock.triage.v2";

export interface TriageBundle {
  schema: typeof TRIAGE_BUNDLE_SCHEMA;
  generatedAt: string;
  browserTarget: BrowserTarget;
  browserVersion: string | null;
  compatibilityMode: "enabled" | "disabled" | "unknown";
  extensionVersion: string | null;
  activeHost: string | null;
  globalEnabled: boolean;
  groups: GroupSettings;
  allowlist: string[];
  enabledRulesets: string[];
  dynamicRulesCount: number;
}

export function buildTriageBundle(input: {
  generatedAt: string;
  browserTarget: BrowserTarget;
  browserVersion: string | null;
  compatibilityMode?: "enabled" | "disabled" | "unknown";
  extensionVersion: string | null;
  activeHost: string | null;
  globalEnabled: boolean;
  groups: GroupSettings;
  allowlist: string[];
  enabledRulesets: string[];
  dynamicRulesCount: number;
}): TriageBundle {
  return {
    schema: TRIAGE_BUNDLE_SCHEMA,
    generatedAt: input.generatedAt,
    browserTarget: input.browserTarget,
    browserVersion: input.browserVersion,
    compatibilityMode: input.compatibilityMode ?? "unknown",
    extensionVersion: input.extensionVersion,
    activeHost: input.activeHost,
    globalEnabled: input.globalEnabled,
    groups: input.groups,
    allowlist: input.allowlist,
    enabledRulesets: input.enabledRulesets,
    dynamicRulesCount: input.dynamicRulesCount
  };
}
