import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../firebase";
import { useCashflowStore } from "../store/useCashflowStore";

export function useFirebaseSync() {
  const setUserProfile = useCashflowStore((state) => state.setUserProfile);
  const setFullPlanData = useCashflowStore((state) => state.setFullPlanData);
  const reset = useCashflowStore((state) => state.reset);

  const unsubscribeSnapshotRef = useRef(null);
  const activeUserRef = useRef(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    const cleanupSnapshot = () => {
      if (unsubscribeSnapshotRef.current) {
        try {
          unsubscribeSnapshotRef.current();
        } catch (err) {
          console.warn("Failed to unsubscribe Firestore listener", err);
        }
        unsubscribeSnapshotRef.current = null;
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Tear down any existing Firestore listener before handling new auth state
      cleanupSnapshot();

      if (!user) {
        activeUserRef.current = null;
        reset();
        return;
      }

      activeUserRef.current = user.uid;
      setUserProfile({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });

      const userDocRef = doc(db, "users", user.uid);

      unsubscribeSnapshotRef.current = onSnapshot(
        userDocRef,
        (docSnap) => {
          // Ignore updates after unmount or if auth changed
          if (unmountedRef.current || activeUserRef.current !== user.uid) return;

          if (docSnap.exists()) {
            const fullData = docSnap.data();

            if (fullData.profile) {
              setUserProfile(fullData.profile);
            }

            if (fullData.data) {
              setFullPlanData(fullData.data);
            }
          } else {
            console.log("No user document found, using default state.");
          }
        },
        (error) => {
          console.error("Firestore sync error:", error);
        }
      );
    });

    return () => {
      unmountedRef.current = true;
      unsubscribeAuth();
      cleanupSnapshot();
    };
  }, [setUserProfile, setFullPlanData, reset]);
}
