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
    const next = enabled ? allowlist.filter((item) => item !== normalized) : [...allowlist, normalized];
    return this.setAllowlist(next);
  }
}

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^\.+/, "").replace(/\.+$/, "");
}
