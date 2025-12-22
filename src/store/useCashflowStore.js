import { createJSONStorage } from "zustand/middleware";
import { useStore } from "./useStore";

/**
 * This module customizes the persisted store behavior without touching the base store definition.
 * - Adds confirmedDiscretionary to the persisted slice and hydrates it safely for legacy data.
 * - Wraps the IndexedDB storage with a safe fallback (localStorage or in-memory) so SSR/private
 *   modes don't crash persistence, and degrades to in-memory when the browser blocks storage.
 * - Preserves existing merge/partialize logic and legacy key mapping defined in useStore.
 */

const memory = new Map();
const memoryStorage = {
  getItem: async (name) => (memory.has(name) ? memory.get(name) : null),
  setItem: async (name, value) => {
    memory.set(name, value);
  },
  removeItem: async (name) => {
    memory.delete(name);
  },
};

const canUseLocalStorage = () => {
  try {
    if (!("localStorage" in window) || !window.localStorage) return false;

    const probeKey = "__cashflow_storage_probe__";
    window.localStorage.setItem(probeKey, "ok");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
};

const fallbackStorage = (() => {
  if (typeof window === "undefined") {
    return createJSONStorage(() => memoryStorage);
  }

  if (canUseLocalStorage()) {
    return createJSONStorage(() => window.localStorage);
  }

  return createJSONStorage(() => memoryStorage);
})();

const normalizeMode = (mode) => {
  if (!mode || mode === "projected") return "planned";
  return mode === "actual" ? "actual" : "planned";
};

const normalizePlanDataModes = (data) => {
  if (!data || typeof data !== "object") return data;

  const normalized = { ...data };

  if ("mode" in normalized) {
    normalized.mode = normalizeMode(normalized.mode);
  }

  if (normalized.plannerSettings && typeof normalized.plannerSettings === "object") {
    normalized.plannerSettings = { ...normalized.plannerSettings };
    if ("mode" in normalized.plannerSettings) {
      normalized.plannerSettings.mode = normalizeMode(normalized.plannerSettings.mode);
    }
  }

  return normalized;
};

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

  let forceFallback = false;
  const withSafeStorage = async (method, name, value) => {
    const activeStorage = forceFallback ? fallbackStorage : baseStorage;

    try {
      if (activeStorage?.[method]) {
        return await activeStorage[method](name, value);
      }
    } catch (error) {
      forceFallback = true;
      console.warn(`IndexedDB ${method} failed, using fallback storage`, error);
    }

    forceFallback = true;
    return fallbackStorage[method](name, value);
  };

  const safeStorage = {
    getItem: (name) => withSafeStorage("getItem", name),
    setItem: (name, value) => withSafeStorage("setItem", name, value),
    removeItem: (name) => withSafeStorage("removeItem", name),
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
    const normalized = normalizePlanDataModes(data);
    original(normalized);
    useStore.getState().setHasHydrated?.(true);
  };
  wrapped.__patched = true;

  useStore.setState({ setFullPlanData: wrapped }, false);
};

patchPersistence();
patchSetFullPlanData();

export const useCashflowStore = useStore;
export default useCashflowStore;
