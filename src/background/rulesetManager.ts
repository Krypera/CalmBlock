import { ALLOWLIST_RULE_START } from "../shared/constants";
import {
  buildAllowlistRules,
  type AllowlistCapacitySummary
} from "../shared/dnrAllowlist";
import { getDisabledRulesets, getEnabledRulesets } from "../shared/rulesetRegistry";
import type { GroupSettings } from "../shared/types";
import { webext, type DynamicRule } from "../shared/webext";

export class RulesetManager {
  async syncGroupRules(groups: GroupSettings): Promise<void> {
    await webext?.declarativeNetRequest?.updateEnabledRulesets?.({
      enableRulesetIds: getEnabledRulesets(groups),
      disableRulesetIds: getDisabledRulesets(groups)
    });
  }

  async syncAllowlistRules(hosts: string[]): Promise<AllowlistCapacitySummary> {
    const dynamicRules: DynamicRule[] =
      (await webext?.declarativeNetRequest?.getDynamicRules?.()) ?? [];
    const ownedRuleIds = dynamicRules
      .map((rule: DynamicRule) => rule.id)
      .filter((id: number) => id >= ALLOWLIST_RULE_START);

    const plan = buildAllowlistRules(hosts);
    const existingOwnedRulesById = new Map(
      dynamicRules
        .filter((rule) => rule.id >= ALLOWLIST_RULE_START)
        .map((rule) => [rule.id, normalizeRule(rule)])
    );
    const nextRulesById = new Map(
      plan.rules.map((rule) => [rule.id, normalizeRule(rule)])
    );

    const removeRuleIds: number[] = [];
    for (const id of ownedRuleIds) {
      const existing = existingOwnedRulesById.get(id);
      const next = nextRulesById.get(id);
      if (!next || next !== existing) {
        removeRuleIds.push(id);
      }
    }

    const addRules = plan.rules.filter((rule) => {
      const existing = existingOwnedRulesById.get(rule.id);
      const next = nextRulesById.get(rule.id);
      return !existing || existing !== next;
    });

    if (removeRuleIds.length > 0 || addRules.length > 0) {
      await webext?.declarativeNetRequest?.updateDynamicRules?.({
        removeRuleIds,
        addRules
      });
    }

    return plan.summary;
  }
}

function normalizeRule(rule: unknown): string {
  return JSON.stringify(sortObjectDeep(rule));
}

function sortObjectDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectDeep(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return Object.fromEntries(entries.map(([key, nested]) => [key, sortObjectDeep(nested)]));
  }
  return value;
}
