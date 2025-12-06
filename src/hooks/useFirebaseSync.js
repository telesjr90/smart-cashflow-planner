import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase"; // Adjust path if needed
import { useCashflowStore } from "../store/useCashflowStore";

export function useFirebaseSync() {
  const setUserProfile = useCashflowStore((state) => state.setUserProfile);
  const setFullPlanData = useCashflowStore((state) => state.setFullPlanData);
  const reset = useCashflowStore((state) => state.reset);

  const unsubscribeSnapshotRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous listener
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }

      if (user) {
        // 1. Set basic profile immediately
        setUserProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });

        // 2. Subscribe to User Data in Firestore
        const userDocRef = doc(db, "users", user.uid);
        unsubscribeSnapshotRef.current = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const fullData = docSnap.data();
              // Sync Profile details if they exist in doc
              if (fullData.profile) {
                setUserProfile(fullData.profile);
              }
              // Sync Plan Data (bills, accounts, etc.)
              if (fullData.data) {
                setFullPlanData(fullData.data);
              }
            } else {
              console.log("No user document found. Using default state.");
            }
          },
          (error) => {
            console.error("Firestore sync error:", error);
          }
        );
      } else {
        // User logged out
        reset();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
      }
    };
  }, [setUserProfile, setFullPlanData, reset]);
}
