import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../firebase";
import { useCashflowStore } from "../store/useCashflowStore";

// ---- Module-level singleton guards to prevent multiple concurrent listeners ----
const AUTH_SYNC_SINGLETON = {
  unsubscribe: null,
  refCount: 0,
};

const FIRESTORE_SYNC_SINGLETON = {
  uid: null,
  unsubscribe: null,
  refCount: 0,
};

const HYDRATION_STATE = {
  uid: null,
  hydrated: false,
};

function safeUnsubscribe(fn) {
  if (typeof fn !== "function") return;
  try {
    fn();
  } catch (err) {
    console.warn("Failed to unsubscribe Firestore listener", err);
  }
}

function cleanupFirestoreListener() {
  if (FIRESTORE_SYNC_SINGLETON.unsubscribe) {
    safeUnsubscribe(FIRESTORE_SYNC_SINGLETON.unsubscribe);
  }
  FIRESTORE_SYNC_SINGLETON.unsubscribe = null;
  FIRESTORE_SYNC_SINGLETON.uid = null;
  HYDRATION_STATE.uid = null;
  HYDRATION_STATE.hydrated = false;
}

export function useFirebaseSync() {
  const setUserProfile = useCashflowStore((state) => state.setUserProfile);
  const setFullPlanData = useCashflowStore((state) => state.setFullPlanData);
  const reset = useCashflowStore((state) => state.reset);
  const setHasHydrated = useCashflowStore((state) => state.setHasHydrated);

  useEffect(() => {
    const markHydratedOnce = (uid) => {
      if (HYDRATION_STATE.uid !== uid) return;
      if (HYDRATION_STATE.hydrated) return;
      HYDRATION_STATE.hydrated = true;
      setHasHydrated?.(true);
    };
    AUTH_SYNC_SINGLETON.refCount += 1;
    FIRESTORE_SYNC_SINGLETON.refCount += 1;

    const ensureFirestoreListener = (userUid) => {
      // Guard: if a listener is already active for this user, do NOT start another
      if (
        FIRESTORE_SYNC_SINGLETON.unsubscribe &&
        FIRESTORE_SYNC_SINGLETON.uid === userUid
      ) {
        return;
      }

      // If a listener exists for a different user (e.g., fast auth transition), replace it
      if (
        FIRESTORE_SYNC_SINGLETON.unsubscribe &&
        FIRESTORE_SYNC_SINGLETON.uid &&
        FIRESTORE_SYNC_SINGLETON.uid !== userUid
      ) {
        cleanupFirestoreListener();
      }

      const userDocRef = doc(db, "users", userUid);
      FIRESTORE_SYNC_SINGLETON.uid = userUid;
      HYDRATION_STATE.uid = userUid;
      HYDRATION_STATE.hydrated = false;

      FIRESTORE_SYNC_SINGLETON.unsubscribe = onSnapshot(
        userDocRef,
        (docSnap) => {
          // Ignore updates if auth changed
          if (FIRESTORE_SYNC_SINGLETON.uid !== userUid) return;

          if (docSnap.exists()) {
            const fullData = docSnap.data();

            if (fullData.profile) {
              setUserProfile(fullData.profile);
            }

            if (fullData.data) {
              setFullPlanData(fullData.data);
            }

            markHydratedOnce(userUid);
          } else {
            console.log("No user document found, using default state.");
            markHydratedOnce(userUid);
          }
        },
        (error) => {
          console.error("Firestore sync error:", error);
        }
      );
    };

    const handleAuthChange = (user) => {
      if (AUTH_SYNC_SINGLETON.refCount === 0) return;

      if (!user) {
        cleanupFirestoreListener();
        reset();
        return;
      }

      // Seed minimal profile immediately (snapshot may replace with doc profile)
      setUserProfile({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });

      ensureFirestoreListener(user.uid);
    };

    if (!AUTH_SYNC_SINGLETON.unsubscribe) {
      AUTH_SYNC_SINGLETON.unsubscribe = onAuthStateChanged(auth, handleAuthChange);
    }

    return () => {
      AUTH_SYNC_SINGLETON.refCount = Math.max(
        0,
        AUTH_SYNC_SINGLETON.refCount - 1
      );
      FIRESTORE_SYNC_SINGLETON.refCount = Math.max(
        0,
        FIRESTORE_SYNC_SINGLETON.refCount - 1
      );

      if (AUTH_SYNC_SINGLETON.refCount === 0) {
        safeUnsubscribe(AUTH_SYNC_SINGLETON.unsubscribe);
        AUTH_SYNC_SINGLETON.unsubscribe = null;
        cleanupFirestoreListener();
      }
    };
  }, [setUserProfile, setFullPlanData, reset, setHasHydrated]);
}
