// src/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  AuthErrorCodes
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

// ✅ Auth persistence: Strict Session or Memory only (No LocalStorage)
// We track the mode to determine if redirects are safe to attempt.
let persistenceMode = "unknown";

// Initialize persistence chain
export const persistenceReady = setPersistence(auth, browserSessionPersistence)
  .then(() => {
    persistenceMode = "session";
  })
  .catch(() => {
    // Fallback to memory if session storage is blocked (e.g. strict privacy settings)
    return setPersistence(auth, inMemoryPersistence).then(() => {
      persistenceMode = "memory";
    });
  })
  .catch((err) => {
    persistenceMode = "memory";
    console.warn("Auth persistence critical failure; defaulting to memory", err);
  });

// ✅ Enable offline persistence (Firestore)
// Wrapped to prevent crashes in environments blocking IndexedDB
enableIndexedDbPersistence(db)
  .then(() => console.log('Offline persistence enabled'))
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Offline persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Offline persistence not available (Private browsing/Restricted env)');
    }
});

// ✅ Auth helpers
const provider = new GoogleAuthProvider();
let inflightLogin = null;

// Handle Redirect Results
// Only attempt this if we are NOT in memory mode, as redirects wipe memory state.
persistenceReady.then(() => {
  if (persistenceMode !== "memory") {
    getRedirectResult(auth).catch((err) => {
      console.warn("Redirect result handling failed", err);
      // We do not throw here to prevent app crash on load
    });
  }
});

export const loginWithGoogle = async () => {
  await persistenceReady;

  // If previous attempt is still running, return it to prevent duplicate popups/redirects
  if (inflightLogin) return inflightLogin;

  // Helper to determine if we can use redirects
  const isRedirectSupported = persistenceMode !== "memory";
  
  // Check for force-redirect flags or headless environments
  const forceRedirect =
    typeof window !== 'undefined' &&
    (window.location.search.includes('redirectAuth=1') ||
      window.navigator?.userAgent?.includes('Headless'));

  // 1. Attempt Redirect if forced and supported
  if (forceRedirect) {
    if (!isRedirectSupported) {
      const error = new Error("Redirect authentication is not supported in this browser environment (Memory-only persistence).");
      error.code = 'auth/operation-not-supported-in-this-environment';
      throw error;
    }
    inflightLogin = signInWithRedirect(auth, provider); // Returns promise that resolves on next page load
    return inflightLogin;
  }

  // 2. Standard Flow: Try Popup first
  inflightLogin = signInWithPopup(auth, provider)
    .catch(async (err) => {
      const errorCode = err?.code;
      
      // Handle Popup Blocking
      if (
        errorCode === AuthErrorCodes.POPUP_BLOCKED ||
        errorCode === AuthErrorCodes.POPUP_CLOSED_BY_USER ||
        errorCode === 'auth/cancelled-popup-request'
      ) {
        console.warn('Popup blocked or closed. Attempting fallback...');

        // If we are in Memory mode, we CANNOT Redirect.
        // The user must enable Popups or allow Cookies (to get Session persistence).
        if (!isRedirectSupported) {
          const fatalError = new Error("Authentication failed. Popups are blocked and strict privacy settings prevent redirect authentication. Please enable popups or third-party cookies for this site.");
          fatalError.code = 'auth/configuration-not-supported';
          throw fatalError;
        }

        // If Session persistence exists, we can safely Redirect
        try {
          await signInWithRedirect(auth, provider);
          // signInWithRedirect doesn't return a user credential immediately; it reloads.
          // We return a pending promise to keep UI in "loading" state.
          return new Promise(() => {}); 
        } catch (redirectErr) {
          throw redirectErr;
        }
      }
      
      // Propagate other errors (e.g. network issues, wrong password)
      throw err;
    })
    .finally(() => {
      // Clear inflight flag ONLY if we aren't redirecting (redirects wipe page anyway)
      // If we successfully triggered a redirect, we leave this non-null (though page will reload)
      if (persistenceMode === 'memory') { 
         inflightLogin = null; 
      } else {
        // Checking if the promise rejected allows us to clear it. 
        // If it resolved (popup success), we clear it.
        // If it's a redirect pending, we let page reload handle it.
        inflightLogin = null; 
      }
    });

  return inflightLogin;
};

export const logout = () => signOut(auth);
