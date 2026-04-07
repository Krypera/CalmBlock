import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readJson(filePath: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), filePath), "utf8"));
}

interface RulesMetadataGroupInfo {
  ruleCount: number;
  idRange: { start: number; end: number };
  sourceDigest: string;
  changes: { added: number; removed: number; delta: number };
}

interface RulesMetadata {
  generatedAt: string;
  groups: Record<string, RulesMetadataGroupInfo>;
}

describe("rules pipeline outputs", () => {
  it("keeps metadata and generated rules in sync", () => {
    const metadata = readJson("public/rules/metadata.json") as RulesMetadata;
    expect(typeof metadata.generatedAt).toBe("string");
    for (const [group, info] of Object.entries(metadata.groups)) {
      const rules = readJson(`public/rules/${group}.json`);
      expect(rules.length).toBe(info.ruleCount);
      const ids = new Set(rules.map((rule: { id: number }) => rule.id));
      expect(ids.size).toBe(rules.length);
      const firstRuleId = rules[0]?.id ?? null;
      const lastRuleId = rules[rules.length - 1]?.id ?? null;
      expect(info.idRange.start).toBe(firstRuleId);
      expect(info.idRange.end).toBe(lastRuleId);
      expect(typeof info.sourceDigest).toBe("string");
      expect(info.sourceDigest.length).toBe(16);
      const changes = info.changes;
      expect(changes.added).toBeGreaterThanOrEqual(0);
      expect(changes.removed).toBeGreaterThanOrEqual(0);
      expect(changes.delta).toBe(changes.added - changes.removed);
    }
  });
});
