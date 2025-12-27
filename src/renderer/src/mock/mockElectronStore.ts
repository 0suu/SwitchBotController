type ElectronStoreAPI = {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<{ success: boolean; error?: string }>;
  delete: (key: string) => Promise<{ success: boolean; error?: string }>;
  getAll: () => Promise<Record<string, any> | undefined>;
};

const prefix = "mock-electron-store:";

const hasLocalStorage = () => typeof window !== "undefined" && !!window.localStorage;

const readLocal = (key: string) => {
  if (!hasLocalStorage()) return null;
  return window.localStorage.getItem(`${prefix}${key}`);
};

const writeLocal = (key: string, value: string) => {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(`${prefix}${key}`, value);
};

const deleteLocal = (key: string) => {
  if (!hasLocalStorage()) return;
  window.localStorage.removeItem(`${prefix}${key}`);
};

export const createMockElectronStore = (): ElectronStoreAPI => {
  const memory: Record<string, any> = {};

  return {
    async get(key: string) {
      const raw = readLocal(key);
      if (raw !== null) {
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      return memory[key];
    },
    async set(key: string, value: any) {
      memory[key] = value;
      try {
        writeLocal(key, JSON.stringify(value));
      } catch {
        // ignore serialization issues in mock storage
      }
      return { success: true };
    },
    async delete(key: string) {
      delete memory[key];
      deleteLocal(key);
      return { success: true };
    },
    async getAll() {
      const snapshot: Record<string, any> = { ...memory };
      if (hasLocalStorage()) {
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const storageKey = window.localStorage.key(i);
          if (storageKey && storageKey.startsWith(prefix)) {
            const shortKey = storageKey.replace(prefix, "");
            const raw = window.localStorage.getItem(storageKey);
            if (raw !== null) {
              try {
                snapshot[shortKey] = JSON.parse(raw);
              } catch {
                snapshot[shortKey] = raw;
              }
            }
          }
        }
      }
      return snapshot;
    },
  };
};
