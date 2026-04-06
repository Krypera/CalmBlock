import { describe, expect, it } from "vitest";
import { buildAllowlistRules } from "../../src/shared/dnrAllowlist";
import { ALLOWLIST_RULE_START } from "../../src/shared/constants";

describe("DNR allowlist rule generation", () => {
  it("creates deterministic allow rules for each host", () => {
    const rules = buildAllowlistRules(["example.com", "news.example.com"]);
    expect(rules).toHaveLength(4);
    expect(rules[0].id).toBe(ALLOWLIST_RULE_START);
    expect(rules[1].id).toBe(ALLOWLIST_RULE_START + 1);
    expect(rules[2].id).toBe(ALLOWLIST_RULE_START + 2);
  });
});
