import type { GroupSettings, ProtectionGroup } from "./types";

export interface RulesetDescriptor {
  id: ProtectionGroup;
  title: string;
  description: string;
}

export const RULESET_REGISTRY: RulesetDescriptor[] = [
  {
    id: "ads",
    title: "Ads",
    description: "Blocks common ad delivery domains."
  },
  {
    id: "trackers",
    title: "Trackers",
    description: "Blocks known tracking and analytics endpoints."
  },
  {
    id: "annoyances",
    title: "Annoyances",
    description: "Blocks common push prompts and nuisance script hosts."
  },
  {
    id: "strict",
    title: "Strict Privacy",
    description: "Applies extra strict blocking at the risk of occasional breakage."
  }
];

export function getEnabledRulesets(groups: GroupSettings): string[] {
  return RULESET_REGISTRY.filter((item) => groups[item.id]).map((item) => item.id);
}

export function getDisabledRulesets(groups: GroupSettings): string[] {
  return RULESET_REGISTRY.filter((item) => !groups[item.id]).map((item) => item.id);
}

