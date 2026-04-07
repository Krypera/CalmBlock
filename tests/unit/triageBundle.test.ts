import { describe, expect, it } from "vitest";
import { TRIAGE_BUNDLE_SCHEMA, buildTriageBundle } from "../../src/shared/triageBundle";

describe("triage bundle schema", () => {
  it("builds stable v1 payload", () => {
    const bundle = buildTriageBundle({
      generatedAt: "2026-04-07T00:00:00.000Z",
      browserTarget: "chrome",
      browserVersion: "123.0.0.0",
      extensionVersion: "0.1.1",
      activeHost: "example.com",
      globalEnabled: true,
      groups: {
        ads: true,
        trackers: true,
        annoyances: true,
        strict: false
      },
      allowlist: ["example.org"],
      enabledRulesets: ["ads", "trackers", "annoyances"],
      dynamicRulesCount: 1
    });

    expect(bundle.schema).toBe(TRIAGE_BUNDLE_SCHEMA);
    expect(bundle).toMatchObject({
      browserTarget: "chrome",
      browserVersion: "123.0.0.0",
      compatibilityMode: "unknown",
      extensionVersion: "0.1.1",
      activeHost: "example.com",
      globalEnabled: true
    });
    expect(bundle.groups.strict).toBe(false);
  });
});
