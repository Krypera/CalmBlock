import { describe, expect, it, vi } from "vitest";
import { AnnoyanceEngine } from "../../src/content/annoyanceEngine";
import { loadFixture } from "./fixtureHarness";

describe("AnnoyanceEngine", () => {
  it("clicks dismiss-like buttons inside nuisance containers", () => {
    loadFixture("annoyance-consent.html");
    const button = document.querySelector<HTMLButtonElement>("button");
    if (!button) {
      throw new Error("Fixture missing primary consent button");
    }
    const clickSpy = vi.spyOn(button, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).toHaveBeenCalled();
    engine.stop();
  });

  it("does not click unrelated buttons outside nuisance containers", () => {
    loadFixture("annoyance-nonconsent.html");
    const button = document.querySelector<HTMLButtonElement>("button");
    if (!button) {
      throw new Error("Fixture missing non-consent button");
    }
    const clickSpy = vi.spyOn(button, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).not.toHaveBeenCalled();
    engine.stop();
  });

  it("does not click submit buttons inside forms", () => {
    loadFixture("annoyance-form-submit.html");
    const submitButton = document.querySelector<HTMLButtonElement>("button[type='submit']");
    if (!submitButton) {
      throw new Error("Fixture missing submit button");
    }
    const clickSpy = vi.spyOn(submitButton, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).not.toHaveBeenCalled();
    engine.stop();
  });
});
