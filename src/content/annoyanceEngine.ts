const CLOSE_TEXT_PATTERNS = ["no thanks", "dismiss", "close", "not now", "reject all"];

export class AnnoyanceEngine {
  private observer: MutationObserver | null = null;
  private frameRequested = false;

  start(): void {
    this.scan();
    this.observer = new MutationObserver(() => this.scheduleScan());
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private scheduleScan(): void {
    if (this.frameRequested) {
      return;
    }
    this.frameRequested = true;
    requestAnimationFrame(() => {
      this.frameRequested = false;
      this.scan();
    });
  }

  private scan(): void {
    const candidates = document.querySelectorAll<HTMLElement>(
      "button, [role='button'], .modal [aria-label], [class*='consent'] button"
    );
    for (const candidate of candidates) {
      const text = (candidate.textContent ?? "").trim().toLowerCase();
      if (!text) {
        continue;
      }
      if (CLOSE_TEXT_PATTERNS.some((pattern) => text.includes(pattern))) {
        candidate.click();
      }
    }
  }
}

