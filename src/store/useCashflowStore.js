import { createJSONStorage } from "zustand/middleware";
import { useStore } from "./useStore";

/**
 * This module customizes the persisted store behavior without touching the base store definition.
 * - Adds confirmedDiscretionary to the persisted slice and hydrates it safely for legacy data.
 * - Wraps the IndexedDB storage with a safe fallback (localStorage or in-memory) so SSR/private
 *   modes don't crash persistence.
 * - Preserves existing merge/partialize logic and legacy key mapping defined in useStore.
 */

const memoryStorage = () => {
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
};

const fallbackStorage = (() => {
  if (typeof window === "undefined") {
    return createJSONStorage(memoryStorage);
  }

  try {
    if ("localStorage" in window && window.localStorage) {
      return createJSONStorage(() => window.localStorage);
    }
  } catch {
    // Swallow and fall back to memory
  }

  return createJSONStorage(memoryStorage);
})();

const patchPersistence = () => {
  const persistApi = useStore.persist;
  if (!persistApi?.getOptions || !persistApi.setOptions) return;

  const options = persistApi.getOptions();
  const basePartialize = options.partialize;
  const baseMerge = options.merge;
  const baseStorage = options.storage;

  const patchedPartialize = (state) => {
    const partial = basePartialize ? basePartialize(state) : state;
    return {
      ...partial,
      confirmedDiscretionary: { ...(state.confirmedDiscretionary || {}) },
    };
  };

  const patchedMerge = (persistedState, currentState) => {
    const merged = baseMerge ? baseMerge(persistedState, currentState) : { ...currentState, ...persistedState };
    return {
      ...merged,
      confirmedDiscretionary:
        (persistedState && persistedState.confirmedDiscretionary) ||
        currentState.confirmedDiscretionary ||
        {},
    };
  };

  const safeStorage = {
    getItem: async (name) => {
      try {
        if (baseStorage?.getItem) {
          return await baseStorage.getItem(name);
        }
      } catch (error) {
        console.warn("IndexedDB getItem failed, using fallback storage", error);
      }
      return fallbackStorage.getItem(name);
    },
    setItem: async (name, value) => {
      try {
        if (baseStorage?.setItem) {
          await baseStorage.setItem(name, value);
          return;
        }
      } catch (error) {
        console.warn("IndexedDB setItem failed, using fallback storage", error);
      }
      await fallbackStorage.setItem(name, value);
    },
    removeItem: async (name) => {
      try {
        if (baseStorage?.removeItem) {
          await baseStorage.removeItem(name);
          return;
        }
      } catch (error) {
        console.warn("IndexedDB removeItem failed, using fallback storage", error);
      }
      await fallbackStorage.removeItem(name);
    },
  };

  persistApi.setOptions({
    ...options,
    partialize: patchedPartialize,
    merge: patchedMerge,
    storage: safeStorage,
  });
};

const patchSetFullPlanData = () => {
  const current = useStore.getState();
  if (typeof current.setFullPlanData !== "function") return;

  const original = current.setFullPlanData;
  if (original.__patched) return;

  const wrapped = (data) => {
    original(data);
    useStore.getState().setHasHydrated?.(true);
  };
  wrapped.__patched = true;

  useStore.setState({ setFullPlanData: wrapped }, false);
};

patchPersistence();
patchSetFullPlanData();

export const useCashflowStore = useStore;
export default useCashflowStore;
