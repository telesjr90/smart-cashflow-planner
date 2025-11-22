// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// 🔹 Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBaHuihJ6EJYmLCnq2QjPNciM5OrekWyjU",
    authDomain: "cashflow-a1c11.firebaseapp.com",
    projectId: "cashflow-a1c11",
    storageBucket: "cashflow-a1c11.appspot.com",
    messagingSenderId: "1095965191491",
    appId: "1:1095965191491:web:27529824736686126791",
  };

const app = initializeApp(firebaseConfig);

// ✅ Auth
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const loginWithGoogle = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);

// ✅ Firestore with robust network + local cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true,  // <- critical behind some proxies/ad-blockers
  useFetchStreams: false,               // <- pair with long-polling
});
