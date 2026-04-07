import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readJson(filePath: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), filePath), "utf8"));
}

interface RulesMetadataGroupInfo {
  category: string;
  reviewedAt: string;
  fixtures: string[];
  provenance: Array<{ id: string; label: string; kind: string; reviewedAt: string }>;
  ruleCount: number;
  idRange: { start: number; end: number };
  sourceDigest: string;
  annotationCoverage: { provenance: number; reason: number; fixture: number; tags: number };
  changes: { added: number; removed: number; delta: number };
}

interface RulesMetadata {
  generatedAt: string;
  program: {
    owner: string;
    releaseCadence: string;
    provenancePolicy: string;
    ruleAuthoring: string;
    annotationFields: string[];
    groupCount: number;
  };
  summary: {
    groupCount: number;
    totalRules: number;
    annotatedRules: number;
    annotationRate: number;
  };
  groups: Record<string, RulesMetadataGroupInfo>;
}

describe("rules pipeline outputs", () => {
  it("keeps metadata and generated rules in sync", () => {
    const metadata = readJson("public/rules/metadata.json") as RulesMetadata;
    expect(typeof metadata.generatedAt).toBe("string");
    expect(metadata.program.owner.length).toBeGreaterThan(0);
    expect(metadata.program.annotationFields).toContain("provenance");
    expect(metadata.summary.groupCount).toBeGreaterThan(0);
    expect(metadata.summary.totalRules).toBeGreaterThan(0);
    expect(metadata.summary.annotationRate).toBeGreaterThan(0);
    for (const [group, info] of Object.entries(metadata.groups)) {
      const rules = readJson(`public/rules/${group}.json`);
      expect(rules.length).toBe(info.ruleCount);
      const ids = new Set(rules.map((rule: { id: number }) => rule.id));
      expect(ids.size).toBe(rules.length);
      expect(info.category.length).toBeGreaterThan(0);
      expect(info.reviewedAt).toMatch(/^2026-04-07/);
      expect(Array.isArray(info.fixtures)).toBe(true);
      expect(Array.isArray(info.provenance)).toBe(true);
      expect(info.provenance.length).toBeGreaterThan(0);
      const firstRuleId = rules[0]?.id ?? null;
      const lastRuleId = rules[rules.length - 1]?.id ?? null;
      expect(info.idRange.start).toBe(firstRuleId);
      expect(info.idRange.end).toBe(lastRuleId);
      expect(typeof info.sourceDigest).toBe("string");
      expect(info.sourceDigest.length).toBe(16);
      expect(info.annotationCoverage.provenance).toBeGreaterThanOrEqual(0);
      expect(info.annotationCoverage.reason).toBeGreaterThanOrEqual(0);
      const changes = info.changes;
      expect(changes.added).toBeGreaterThanOrEqual(0);
      expect(changes.removed).toBeGreaterThanOrEqual(0);
      expect(changes.delta).toBe(changes.added - changes.removed);
    }
  });
});
