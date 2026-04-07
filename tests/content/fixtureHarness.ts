import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadFixture(name: string): void {
  const filePath = resolve(process.cwd(), "tests/content/fixtures", name);
  const html = readFileSync(filePath, "utf8");
  document.querySelector("#calmblock-cosmetic-style")?.remove();
  document.body.innerHTML = html;
}
