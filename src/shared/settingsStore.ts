import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants";
import { ExtensionStorage } from "./storage";
import type { GlobalSettings, SettingsExport } from "./types";

interface KeyValueStorage {
  get: <T>(key: string, fallback: T) => Promise<T>;
  set: <T>(key: string, value: T) => Promise<void>;
}

export class GlobalSettingsStore {
  constructor(private readonly storage: KeyValueStorage = new ExtensionStorage()) {}

  async get(): Promise<GlobalSettings> {
    const value = await this.storage.get<GlobalSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    return this.mergeWithDefaults(value);
  }

  async set(next: GlobalSettings): Promise<void> {
    await this.storage.set(STORAGE_KEYS.settings, this.mergeWithDefaults(next));
  }

  async update(patch: Partial<GlobalSettings>): Promise<GlobalSettings> {
    const current = await this.get();
    const merged = this.mergeWithDefaults({
      ...current,
      ...patch,
      groups: {
        ...current.groups,
        ...patch.groups
      }
    });
    await this.set(merged);
    return merged;
  }

  validateImportedSettings(input: unknown): input is SettingsExport {
    if (!input || typeof input !== "object") {
      return false;
    }
    const data = input as Partial<SettingsExport>;
    return data.version === 1 && !!data.settings && Array.isArray(data.allowlist);
  }

  private mergeWithDefaults(value: GlobalSettings): GlobalSettings {
    return {
      enabled: value.enabled ?? DEFAULT_SETTINGS.enabled,
      advancedMode: value.advancedMode ?? DEFAULT_SETTINGS.advancedMode,
      groups: {
        ...DEFAULT_SETTINGS.groups,
        ...value.groups
      }
    };
  }
}
