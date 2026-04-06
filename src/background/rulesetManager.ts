import { ALLOWLIST_RULE_START } from "../shared/constants";
import { buildAllowlistRules } from "../shared/dnrAllowlist";
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

  async syncAllowlistRules(hosts: string[]): Promise<void> {
    const dynamicRules: DynamicRule[] = (await webext?.declarativeNetRequest?.getDynamicRules?.()) ?? [];
    const ownedRuleIds = dynamicRules
      .map((rule: DynamicRule) => rule.id)
      .filter((id: number) => id >= ALLOWLIST_RULE_START);

    const newRules = buildAllowlistRules(hosts);

    await webext?.declarativeNetRequest?.updateDynamicRules?.({
      removeRuleIds: ownedRuleIds,
      addRules: newRules
    });
  }
}
