export type DnrResourceType =
  | "main_frame"
  | "sub_frame"
  | "script"
  | "stylesheet"
  | "image"
  | "font"
  | "object"
  | "xmlhttprequest"
  | "ping"
  | "media"
  | "websocket"
  | "other";

export interface DynamicRule {
  id: number;
}

export interface WebExtLike {
  runtime?: {
    sendMessage?: (message: unknown) => Promise<any>;
    onInstalled?: { addListener: (cb: () => void | Promise<void>) => void };
    onMessage?: {
      addListener: (
        cb: (message: any) => any
      ) => void;
    };
  };
  storage?: {
    local?: {
      get: (keys?: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
      remove?: (keys: string | string[]) => Promise<void>;
    };
    onChanged?: {
      addListener: (
        cb: (changes: Record<string, unknown>, areaName: string) => void | Promise<void>
      ) => void;
    };
  };
  tabs?: {
    query?: (queryInfo?: { active?: boolean; currentWindow?: boolean }) => Promise<Array<{ id?: number; url?: string }>>;
    sendMessage?: (tabId: number, message: unknown) => Promise<unknown>;
    onUpdated?: {
      addListener: (
        cb: (
          tabId: number,
          changeInfo: { status?: string },
          tab: { id?: number; url?: string }
        ) => void | Promise<void>
      ) => void;
    };
  };
  action?: {
    setBadgeText?: (details: { tabId: number; text: string }) => Promise<void>;
    setBadgeBackgroundColor?: (details: { tabId: number; color: string }) => Promise<void>;
  };
  permissions?: {
    request?: (permissions: { permissions: string[] }) => Promise<boolean>;
    contains?: (permissions: { permissions: string[] }) => Promise<boolean>;
  };
  declarativeNetRequest?: {
    updateEnabledRulesets?: (details: { enableRulesetIds: string[]; disableRulesetIds: string[] }) => Promise<void>;
    getDynamicRules?: () => Promise<DynamicRule[]>;
    updateDynamicRules?: (details: { removeRuleIds: number[]; addRules: unknown[] }) => Promise<void>;
    getEnabledRulesets?: () => Promise<string[]>;
    getMatchedRules?: (options?: { tabId?: number }) => Promise<{
      rulesMatchedInfo: Array<{ rule: { rulesetId?: string } }>;
    }>;
  };
}

const globalAny = globalThis as unknown as {
  browser?: WebExtLike;
  chrome?: WebExtLike;
};

export const webext: WebExtLike | undefined = globalAny.browser ?? globalAny.chrome;
