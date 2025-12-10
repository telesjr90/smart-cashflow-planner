import { createJSONStorage } from "zustand/middleware";

const DB_NAME = "cashflow-app";
const STORE_NAME = "zustand-cache";
const DB_VERSION = 1;

const isIndexedDBAvailable = () =>
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runTransaction = async (mode, action) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = action(store);

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => {
      db.close();
    };
  });
};

const createIndexedDBStorage = () => {
  if (!isIndexedDBAvailable()) {
    const memory = new Map();
    return {
      getItem: async (name) => (memory.has(name) ? memory.get(name) : null),
      setItem: async (name, value) => {
        memory.set(name, value);
      },
      removeItem: async (name) => {
        memory.delete(name);
      },
    };
  }

  return {
    getItem: async (name) => {
      try {
        return await runTransaction("readonly", (store) => store.get(name));
      } catch (error) {
        console.error("IndexedDB getItem failed, falling back to null", error);
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        await runTransaction("readwrite", (store) => store.put(value, name));
      } catch (error) {
        console.error("IndexedDB setItem failed", error);
      }
    },
    removeItem: async (name) => {
      try {
        await runTransaction("readwrite", (store) => store.delete(name));
      } catch (error) {
        console.error("IndexedDB removeItem failed", error);
      }
    },
  };
};

export const indexedDBStorage = createJSONStorage(createIndexedDBStorage);
