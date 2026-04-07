import { STORAGE_KEYS } from "./constants";
import { ExtensionStorage } from "./storage";

interface KeyValueStorage {
  get: <T>(key: string, fallback: T) => Promise<T>;
  set: <T>(key: string, value: T) => Promise<void>;
}

export class SiteSettingsStore {
  constructor(private readonly storage: KeyValueStorage = new ExtensionStorage()) {}

  async getAllowlist(): Promise<string[]> {
    const value = await this.storage.get<string[]>(STORAGE_KEYS.allowlist, []);
    return [...new Set(value.map(normalizeHost).filter(Boolean))];
  }

  async setAllowlist(input: string[]): Promise<string[]> {
    const cleaned = [...new Set(input.map(normalizeHost).filter(Boolean))];
    await this.storage.set(STORAGE_KEYS.allowlist, cleaned);
    return cleaned;
  }

  async isAllowlisted(host: string): Promise<boolean> {
    const allowlist = await this.getAllowlist();
    return allowlist.includes(normalizeHost(host));
  }

  async setHostEnabled(host: string, enabled: boolean): Promise<string[]> {
    const normalized = normalizeHost(host);
    if (!normalized) {
      return this.getAllowlist();
    }
    const allowlist = await this.getAllowlist();
    const next = enabled
      ? allowlist.filter((item) => item !== normalized)
      : [normalized, ...allowlist.filter((item) => item !== normalized)];
    return this.setAllowlist(next);
  }
}

export function normalizeHost(host: string): string {
  return sanitizeHostInput(host) ?? "";
}

export function sanitizeHostInput(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) {
    return null;
  }

  if (value.includes("://")) {
    try {
      value = new URL(value).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  value = value
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .split(/[/?#]/, 1)[0]
    .split(":", 1)[0]
    .trim();

  if (!value || value.includes("..")) {
    return null;
  }
  if (isIPv4(value)) {
    return value;
  }
  if (value === "localhost") {
    return value;
  }

  const labels = value.split(".");
  if (labels.length < 2) {
    return null;
  }
  for (const label of labels) {
    if (!label || label.length > 63) {
      return null;
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      return null;
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return null;
    }
  }
  return value;
}

function isIPv4(value: string): boolean {
  const segments = value.split(".");
  if (segments.length !== 4) {
    return false;
  }
  return segments.every((segment) => {
    if (!/^\d+$/.test(segment)) {
      return false;
    }
    const number = Number(segment);
    return number >= 0 && number <= 255;
  });
}
