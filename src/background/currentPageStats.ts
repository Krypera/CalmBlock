import { defaultCategoryCounters } from "../shared/popupState";
import { PermissionManager } from "../shared/permissionManager";
import type { LiveStatsStatus, ProtectionGroup } from "../shared/types";
import { webext } from "../shared/webext";

const RULESET_TO_CATEGORY: Record<string, ProtectionGroup> = {
  ads: "ads",
  trackers: "trackers",
  annoyances: "annoyances",
  strict: "strict"
};

const permissionManager = new PermissionManager();

export async function getCurrentPageStats(tabId: number): Promise<{
  total: number | null;
  liveStatsAvailable: boolean;
  status: LiveStatsStatus;
  byCategory: Record<ProtectionGroup, number>;
}> {
  const byCategory = defaultCategoryCounters();

  try {
    const capability = await permissionManager.getFeedbackCapability();
    if (!capability.matchedRuleTelemetry) {
      return unavailableStats(byCategory, "capability-unavailable");
    }

    if (capability.permissionGranted === false) {
      return unavailableStats(
        byCategory,
        capability.canRequestPermission ? "permission-required" : "capability-unavailable"
      );
    }

    const getMatchedRules = webext?.declarativeNetRequest?.getMatchedRules;
    if (!getMatchedRules) {
      return unavailableStats(byCategory, "capability-unavailable");
    }

    const result = await getMatchedRules({ tabId });
    const matched = result.rulesMatchedInfo ?? [];
    for (const item of matched) {
      const rulesetId = item.rule.rulesetId ?? "";
      const category = RULESET_TO_CATEGORY[rulesetId];
      if (category) {
        byCategory[category] += 1;
      }
    }
    const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
    return { total, liveStatsAvailable: true, status: "live", byCategory };
  } catch {
    return unavailableStats(byCategory, "session-unavailable");
  }
}

function unavailableStats(
  byCategory: Record<ProtectionGroup, number>,
  status: Exclude<LiveStatsStatus, "live">
) {
  return {
    total: null,
    liveStatsAvailable: false,
    status,
    byCategory
  };
}
