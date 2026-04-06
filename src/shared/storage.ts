import { webext } from "./webext";

export interface StorageAreaLike {
  get: (keys?: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
}

export class ExtensionStorage {
  private readonly area: StorageAreaLike;

  constructor(area?: StorageAreaLike) {
    this.area = area ?? resolveStorageArea();
  }

  async get<T>(key: string, fallback: T): Promise<T> {
    const data = await this.area.get(key);
    const value = data[key];
    return (value as T | undefined) ?? fallback;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.area.set({ [key]: value });
  }
}

function resolveStorageArea(): StorageAreaLike {
  const nativeArea = webext?.storage?.local as
    | {
        get: (keys?: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>;
        set: (items: Record<string, unknown>) => Promise<void>;
      }
    | undefined;

  if (nativeArea) {
    return nativeArea;
  }

  return {
    async get() {
      return {};
    },
    async set() {}
  };
}
