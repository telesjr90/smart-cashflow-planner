// src/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
} from 'firebase/firestore';

// ✅ Your Firebase project configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBaHuihJ6EJYmLCnq2QjPNciM5OrekWyjU',
  authDomain: 'cashflow-a1c11.firebaseapp.com',
  projectId: 'cashflow-a1c11',
  storageBucket: 'cashflow-a1c11.appspot.com',
  messagingSenderId: '1095965191491',
  appId: '1:1095965191491:web:27529824736686126791',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Enable offline persistence
enableIndexedDbPersistence(db)
  .then(() => console.log('Offline persistence enabled'))
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Offline persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Offline persistence not available');
    }
  });

// ✅ Auth helpers
const provider = new GoogleAuthProvider();
export const loginWithGoogle = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);
