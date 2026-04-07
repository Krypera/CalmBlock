import { webext } from "./webext";

export interface StorageAreaLike {
  get: (keys?: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
}

export interface StorageStatus {
  mode: "native" | "memory-fallback";
  warning: string | null;
}

const memoryStore = new Map<string, unknown>();
let storageStatus: StorageStatus = {
  mode: "native",
  warning: null
};
const warnedMessages = new Set<string>();

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

export function getStorageStatus(): StorageStatus {
  const nativeArea = resolveNativeStorageArea();
  if (storageStatus.mode === "memory-fallback") {
    return storageStatus;
  }
  if (nativeArea) {
    return storageStatus;
  }
  warnStorageFallback(
    "Extension storage.local is unavailable; CalmBlock will keep settings in memory for this session."
  );
  return storageStatus;
}

function resolveStorageArea(): StorageAreaLike {
  const nativeArea = resolveNativeStorageArea();

  if (nativeArea) {
    return {
      async get(keys) {
        try {
          return await nativeArea.get(keys);
        } catch (error) {
          warnStorageFallback(
            `Extension storage read failed; using in-memory fallback instead (${formatStorageError(error)}).`
          );
          return memoryFallbackArea.get(keys);
        }
      },
      async set(items) {
        try {
          await nativeArea.set(items);
        } catch (error) {
          warnStorageFallback(
            `Extension storage write failed; using in-memory fallback instead (${formatStorageError(error)}).`
          );
          await memoryFallbackArea.set(items);
        }
      }
    };
  }

  warnStorageFallback(
    "Extension storage.local is unavailable; CalmBlock will keep settings in memory for this session."
  );
  return memoryFallbackArea;
}

function resolveNativeStorageArea() {
  const nativeArea = webext?.storage?.local as
    | {
        get: (keys?: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>;
        set: (items: Record<string, unknown>) => Promise<void>;
      }
    | undefined;

  if (!nativeArea) {
    return null;
  }
  if (typeof nativeArea.get !== "function" || typeof nativeArea.set !== "function") {
    return null;
  }
  return nativeArea;
}

const memoryFallbackArea: StorageAreaLike = {
  async get(keys) {
    if (keys == null) {
      return Object.fromEntries(memoryStore.entries());
    }
    if (typeof keys === "string") {
      return { [keys]: memoryStore.get(keys) };
    }
    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, memoryStore.get(key)]));
    }

    const result: Record<string, unknown> = {};
    for (const [key, fallback] of Object.entries(keys)) {
      result[key] = memoryStore.has(key) ? memoryStore.get(key) : fallback;
    }
    return result;
  },
  async set(items) {
    for (const [key, value] of Object.entries(items)) {
      memoryStore.set(key, value);
    }
  }
};

function warnStorageFallback(message: string): void {
  storageStatus = {
    mode: "memory-fallback",
    warning: message
  };
  if (warnedMessages.has(message)) {
    return;
  }
  warnedMessages.add(message);
  console.warn(`[CalmBlock] ${message}`);
}

function formatStorageError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "unknown storage error";
}
