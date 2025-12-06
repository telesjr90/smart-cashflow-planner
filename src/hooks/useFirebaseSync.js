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



  useEffect(() => {

    // 1. Listen for Auth Changes

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {

      // Clean up previous Firestore listener if exists

      if (unsubscribeSnapshotRef.current) {

        unsubscribeSnapshotRef.current();

        unsubscribeSnapshotRef.current = null;

      }



      if (user) {

        // User is signed in: Update profile in store

        setUserProfile({

          uid: user.uid,

          email: user.email,

          displayName: user.displayName,

        });



        // 2. Real-time Listener for User Data

        const userDocRef = doc(db, "users", user.uid);

        

        unsubscribeSnapshotRef.current = onSnapshot(

          userDocRef,

          (docSnap) => {

            if (docSnap.exists()) {

              const fullData = docSnap.data();

              

              // Update Profile if present in doc

              if (fullData.profile) {

                setUserProfile(fullData.profile);

              }



              // Update Plan Data (bills, accounts, etc.)

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

      } else {

        // User is signed out: Reset store to initial state

        reset();

      }

    });



    // Cleanup auth listener on unmount

    return () => {

      unsubscribeAuth();

      if (unsubscribeSnapshotRef.current) {

        unsubscribeSnapshotRef.current();

      }

    };

  }, [setUserProfile, setFullPlanData, reset]);

}
