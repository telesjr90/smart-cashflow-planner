import admin from "firebase-admin";

function parseServiceAccount() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (base64) {
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(decoded);
  }

  if (json) {
    return JSON.parse(json);
  }

  return null;
}

function resolveCredential() {
  const serviceAccount = parseServiceAccount();
  if (serviceAccount) {
    return admin.credential.cert(serviceAccount);
  }
  return admin.credential.applicationDefault();
}

let appInstance = null;

export function getAdminApp() {
  if (appInstance) return appInstance;
  const credential = resolveCredential();
  const serviceAccount = parseServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id;

  appInstance = admin.initializeApp({
    credential,
    projectId,
  });

  return appInstance;
}

export function getDb() {
  return getAdminApp().firestore();
}

export function getAuth() {
  return getAdminApp().auth();
}
