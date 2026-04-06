import { ALLOWLIST_RULE_START, DNR_RESOURCE_TYPES } from "./constants";

const MAX_ALLOWLIST_HOSTS = 1_500;

export function buildAllowlistRules(hosts: string[]) {
  const trimmed = hosts.slice(0, MAX_ALLOWLIST_HOSTS);
  return trimmed.flatMap((host, index) => {
    const baseId = ALLOWLIST_RULE_START + index * 2;
    return [
      {
        id: baseId,
        priority: 10_000,
        action: { type: "allow" as const },
        condition: {
          initiatorDomains: [host],
          resourceTypes: DNR_RESOURCE_TYPES
        }
      },
      {
        id: baseId + 1,
        priority: 10_000,
        action: { type: "allow" as const },
        condition: {
          requestDomains: [host],
          resourceTypes: ["main_frame", "sub_frame"] as const
        }
      }
    ];
  });
}

