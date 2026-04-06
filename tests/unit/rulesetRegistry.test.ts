import { describe, expect, it } from "vitest";
import { getDisabledRulesets, getEnabledRulesets } from "../../src/shared/rulesetRegistry";

const groups = {
  ads: true,
  trackers: false,
  annoyances: true,
  strict: false
};

describe("ruleset registry", () => {
  it("returns enabled and disabled ids", () => {
    expect(getEnabledRulesets(groups)).toEqual(["ads", "annoyances"]);
    expect(getDisabledRulesets(groups)).toEqual(["trackers", "strict"]);
  });
});

