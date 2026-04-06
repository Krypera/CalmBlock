import { describe, expect, it, vi } from "vitest";
import { AnnoyanceEngine } from "../../src/content/annoyanceEngine";

describe("AnnoyanceEngine", () => {
  it("clicks dismiss-like buttons", () => {
    const button = document.createElement("button");
    button.textContent = "No thanks";
    const clickSpy = vi.spyOn(button, "click");
    document.body.append(button);

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).toHaveBeenCalled();
    engine.stop();
  });
});

