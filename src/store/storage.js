import { createJSONStorage } from "zustand/middleware";
import { del, get, set } from "idb-keyval";

const isBrowser = typeof window !== "undefined";

const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

const idbStorage = {
  async getItem(name) {
    if (!isBrowser) return null;
    try {
      return await get(name);
    } catch (error) {
      console.warn("[storage] read failed", { name, error });
      return null;
    }
  },
  async setItem(name, value) {
    if (!isBrowser) return;
    try {
      await set(name, value);
    } catch (error) {
      console.warn("[storage] write failed", { name, error });
    }
  },
  async removeItem(name) {
    if (!isBrowser) return;
    try {
      await del(name);
    } catch (error) {
      console.warn("[storage] remove failed", { name, error });
    }
  },
};

export const indexedDbStorage = createJSONStorage(() =>
  isBrowser ? idbStorage : noopStorage
);

export default indexedDbStorage;
