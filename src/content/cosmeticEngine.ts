export const COSMETIC_SELECTORS = [
  ".adsbox",
  "[id*='ad-slot']",
  "[class*='ad-banner']",
  ".sponsored",
  "iframe[src*='doubleclick']",
  "iframe[src*='googlesyndication']",
  "[class*='cookie-banner']",
  "[id*='cookie-banner']",
  "[data-testid*='cookie-banner']"
];

export class CosmeticEngine {
  private styleEl: HTMLStyleElement | null = null;

  apply(): void {
    if (this.styleEl) {
      return;
    }
    const style = document.createElement("style");
    style.id = "calmblock-cosmetic-style";
    style.textContent = `${COSMETIC_SELECTORS.join(",")} { display: none !important; visibility: hidden !important; }`;
    (document.head || document.documentElement).append(style);
    this.styleEl = style;
  }

  clear(): void {
    this.styleEl?.remove();
    this.styleEl = null;
  }
}
