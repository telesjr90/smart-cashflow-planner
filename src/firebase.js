// path: src/firebase.js
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
  AuthErrorCodes,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

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
let persistenceMode = 'unknown';

const persistenceReadyInternal = setPersistence(auth, browserSessionPersistence)
  .then(() => {
    persistenceMode = 'session';
  })
  .catch(() => {
    return setPersistence(auth, inMemoryPersistence).then(() => {
      persistenceMode = 'memory';
    });
  })
  .catch((err) => {
    persistenceMode = 'memory';
    console.warn('Auth persistence critical failure; defaulting to memory', err);
  });

// ✅ Enable offline persistence (Firestore)
enableIndexedDbPersistence(db)
  .then(() => console.log('Offline persistence enabled'))
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Offline persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Offline persistence not available (Private browsing/Restricted env)');
    }
  });

// -------------------------
// E2E (staging) auth bypass
// -------------------------
function isE2EAnonEnabled() {
  if (typeof window === 'undefined') return false;

  const host = String(window.location.hostname || '').toLowerCase();
  const isAllowedHost =
    host.includes('staging') ||
    host === 'localhost' ||
    host === '127.0.0.1';

  if (!isAllowedHost) return false;

  const params = new URLSearchParams(window.location.search);

  // Explicit opt-in: must be running with ?e2e=1
  // We trust this param on allowed hosts (staging/local).
  return params.get('e2e') === '1';
}

let e2eAnonInflight = null;

async function ensureE2EAnonUser() {
  if (!isE2EAnonEnabled()) return null;

  // IMPORTANT: Do NOT await persistence or call Firebase Auth in E2E mode.
  // Time travel in tests can cause Firebase SDK to hang or reject tokens.
  // We return a mock user immediately to guarantee UI entry.
  if (e2eAnonInflight) return e2eAnonInflight;

  console.log('E2E Mode: Returning Mock User immediately (Bypassing Firebase Auth)');
  
  e2eAnonInflight = Promise.resolve({
    uid: 'e2e-mock-user-id',
    isAnonymous: true,
    email: null,
    displayName: 'E2E Mock User',
    getIdToken: async () => 'mock-token'
  });

  return e2eAnonInflight;
}

export const persistenceReady = persistenceReadyInternal
  .catch((err) => {
    console.warn('persistenceReady failed (continuing)', err);
  });

// ✅ Auth helpers
const provider = new GoogleAuthProvider();
let inflightLogin = null;

persistenceReady.then(() => {
  if (isE2EAnonEnabled()) return;

  if (persistenceMode !== 'memory') {
    getRedirectResult(auth).catch((err) => {
      console.warn('Redirect result handling failed', err);
    });
  }
});

try {
  onAuthStateChanged(auth, (user) => {
    // Only auto-sign-in if NOT in E2E mode (since E2E handles it manually via hook)
    if (!user && !isE2EAnonEnabled()) {
       // logic for normal anon fallback if needed
    }
  });
} catch {}

export const loginWithGoogle = async () => {
  // 1. E2E Bypass: Check this FIRST to avoid waiting for persistence
  if (isE2EAnonEnabled()) {
    const user = await ensureE2EAnonUser();
    return { user };
  }

  // 2. Normal Flow
  await persistenceReady;

  if (inflightLogin) return inflightLogin;

  const isRedirectSupported = persistenceMode !== 'memory';

  const forceRedirect =
    typeof window !== 'undefined' &&
    (window.location.search.includes('redirectAuth=1') ||
      window.navigator?.userAgent?.includes('Headless'));

  if (forceRedirect) {
    if (!isRedirectSupported) {
      const error = new Error(
        'Redirect authentication is not supported in this browser environment (Memory-only persistence).'
      );
      error.code = 'auth/operation-not-supported-in-this-environment';
      throw error;
    }
    inflightLogin = signInWithRedirect(auth, provider);
    return inflightLogin;
  }

  inflightLogin = signInWithPopup(auth, provider)
    .catch(async (err) => {
      const errorCode = err?.code;

      if (
        errorCode === AuthErrorCodes.POPUP_BLOCKED ||
        errorCode === AuthErrorCodes.POPUP_CLOSED_BY_USER ||
        errorCode === 'auth/cancelled-popup-request'
      ) {
        console.warn('Popup blocked or closed. Attempting fallback...');

        if (!isRedirectSupported) {
          const fatalError = new Error(
            'Authentication failed. Popups are blocked and strict privacy settings prevent redirect authentication. Please enable popups or third-party cookies for this site.'
          );
          fatalError.code = 'auth/configuration-not-supported';
          throw fatalError;
        }

        await signInWithRedirect(auth, provider);
        return new Promise(() => {});
      }

      if (errorCode === 'auth/unauthorized-domain') {
        const e = new Error(
          [
            'Google sign-in failed: auth/unauthorized-domain.',
            'Fix: Firebase Console -> Authentication -> Settings -> Authorized domains:',
            'add the current hostname (e.g. cashflow-a1c11-staging.web.app).',
          ].join('\n')
        );
        e.code = errorCode;
        throw e;
      }

      throw err;
    })
    .finally(() => {
      inflightLogin = null;
    });

  return inflightLogin;
};

export const logout = () => signOut(auth);