import { defaultCategoryCounters } from "../shared/popupState";
import { PermissionManager } from "../shared/permissionManager";
import type { ProtectionGroup } from "../shared/types";
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
  byCategory: Record<ProtectionGroup, number>;
}> {
  const byCategory = defaultCategoryCounters();

  try {
    const feedbackPermission = await permissionManager.hasFeedbackPermission();
    if (feedbackPermission === false) {
      return { total: null, liveStatsAvailable: false, byCategory };
    }

    const getMatchedRules = webext?.declarativeNetRequest?.getMatchedRules;
    if (!getMatchedRules) {
      return { total: null, liveStatsAvailable: false, byCategory };
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
    return { total, liveStatsAvailable: true, byCategory };
  } catch {
    return { total: null, liveStatsAvailable: false, byCategory };
  }
}
