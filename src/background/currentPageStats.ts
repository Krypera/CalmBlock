import { defaultCategoryCounters } from "../shared/popupState";
import type { ProtectionGroup } from "../shared/types";
import { webext } from "../shared/webext";

const RULESET_TO_CATEGORY: Record<string, ProtectionGroup> = {
  ads: "ads",
  trackers: "trackers",
  annoyances: "annoyances",
  strict: "strict"
};

export async function getCurrentPageStats(tabId: number): Promise<{
  total: number | null;
  byCategory: Record<ProtectionGroup, number>;
}> {
  const byCategory = defaultCategoryCounters();

  try {
    const getMatchedRules = webext?.declarativeNetRequest?.getMatchedRules;
    if (!getMatchedRules) {
      return { total: null, byCategory };
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
    return { total, byCategory };
  } catch {
    return { total: null, byCategory };
  }
}
