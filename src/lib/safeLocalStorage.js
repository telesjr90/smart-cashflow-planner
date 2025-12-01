// File: src/lib/safeLocalStorage.js

/**
 * safeLocalStorage
 *
 * All persistent UI state should go through this wrapper instead of direct
 * window.localStorage access.
 *
 * Why:
 * - Avoids crashes when localStorage is unavailable (SSR, private mode, blocked storage).
 * - Catches and logs storage errors instead of throwing.
 * - Encourages household/user-scoped keys via `makeScopedKey`.
 *
 * Key scoping:
 * - For household-specific data (bills, planner state, settings), ALWAYS include
 *   a householdId in the key when possible.
 * - If householdId is not available but you have a user id (uid), prefer a
 *   user-scoped key.
 * - If neither is available, consider the state ephemeral and either:
 *   - Use a non-scoped key knowing it is global, or
 *   - Skip persistence by treating a `null` key as "no storage".
 */

let cachedStorage;

/**
 * Returns a usable Storage instance or null if unavailable.
 * We lazily detect this once to avoid repeated try/catch.
 */
function getStorage() {
  if (cachedStorage !== undefined) return cachedStorage;

  if (typeof window === "undefined" || !window.localStorage) {
    cachedStorage = null;
    return cachedStorage;
  }

  try {
    const testKey = "__safeLocalStorage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    cachedStorage = window.localStorage;
  } catch (err) {
    console.warn("[safeLocalStorage] localStorage unavailable", err);
    cachedStorage = null;
  }

  return cachedStorage;
}

export const safeLocalStorage = {
  /**
   * Safe wrapper around getItem.
   * @returns {string|null} The stored value or null on failure/unavailability.
   */
  getItem(key) {
    if (!key) return null;
    const storage = getStorage();
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch (err) {
      console.warn("[safeLocalStorage] getItem failed", { key, err });
      return null;
    }
  },

  /**
   * Safe wrapper around setItem.
   * No-op if storage is unavailable or on failure.
   */
  setItem(key, value) {
    if (!key) return;
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch (err) {
      console.warn("[safeLocalStorage] setItem failed", { key, err });
    }
  },

  /**
   * Safe wrapper around removeItem.
   * No-op if storage is unavailable or on failure.
   */
  removeItem(key) {
    if (!key) return;
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch (err) {
      console.warn("[safeLocalStorage] removeItem failed", { key, err });
    }
  },
};

/**
 * makeScopedKey
 *
 * Builds a namespaced key for household/user-bound data.
 *
 * Example:
 *   makeScopedKey("billsSelectedMonth", { householdId: "hh_123" })
 *   => "billsSelectedMonth:household:hh_123"
 *
 * If neither householdId nor uid are provided, returns null so callers can
 * decide to skip persistence and avoid cross-user/household bleed.
 */
export function makeScopedKey(baseKey, { householdId, uid } = {}) {
  if (!baseKey) return null;

  if (householdId) {
    return `${baseKey}:household:${householdId}`;
  }

  if (uid) {
    return `${baseKey}:user:${uid}`;
  }

  // No scope information: treat as non-persisted by returning null.
  // Callers should branch on a null key and keep state in-memory only.
  return null;
}
