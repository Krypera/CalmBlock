import { describe, expect, it, vi } from "vitest";
import { AnnoyanceEngine } from "../../src/content/annoyanceEngine";

describe("AnnoyanceEngine", () => {
  it("clicks dismiss-like buttons inside nuisance containers", () => {
    const container = document.createElement("div");
    container.className = "cookie-consent";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "No thanks";
    const clickSpy = vi.spyOn(button, "click");
    container.append(button);
    document.body.append(container);

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).toHaveBeenCalled();
    engine.stop();
  });

  it("does not click unrelated buttons outside nuisance containers", () => {
    const button = document.createElement("button");
    button.textContent = "Close";
    const clickSpy = vi.spyOn(button, "click");
    document.body.append(button);

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).not.toHaveBeenCalled();
    engine.stop();
  });
});
