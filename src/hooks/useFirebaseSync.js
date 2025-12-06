import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { setTransactions, setLoading, setError } from '../store/slices/financeSlice';

export const useFirebaseSync = () => {
  const dispatch = useDispatch();
  const snapshotUnsubscribeRef = useRef(null);

  useEffect(() => {
    // 1. Listen for Auth Changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Cleanup previous snapshot listener if it exists
      if (snapshotUnsubscribeRef.current) {
        snapshotUnsubscribeRef.current();
        snapshotUnsubscribeRef.current = null;
      }

      if (user) {
        // User is signed in, start fetching data
        dispatch(setLoading(true));
        const q = query(
          collection(db, "transactions"),
          where("uid", "==", user.uid),
          orderBy("date", "desc") // Ensure you have an index for this in Firestore if needed
        );

        // 2. Real-time Listener for Transactions
        const unsubscribeSnapshot = onSnapshot(q, 
          (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Dispatch data to Redux
            dispatch(setTransactions(docs));
            dispatch(setLoading(false));
          },
          (error) => {
            console.error("Firestore Error:", error);
            dispatch(setError(error.message));
            dispatch(setLoading(false));
          }
        );

        // Store the unsubscribe function
        snapshotUnsubscribeRef.current = unsubscribeSnapshot;
      } else {
        // User is signed out, clear data
        dispatch(setTransactions([]));
        dispatch(setLoading(false));
      }
    });

    // Cleanup both auth listener and snapshot listener
    return () => {
      unsubscribeAuth();
      if (snapshotUnsubscribeRef.current) {
        snapshotUnsubscribeRef.current();
        snapshotUnsubscribeRef.current = null;
      }
    };
  }, [dispatch]);
};

