// scripts/markBillsPaidUpTo2025-11-14.js
// ES module version (works with "type": "module" in package.json)

import admin from "firebase-admin";

/**
 * One-off script to mark all bills with dueDay <= 14 in November 2025
 * as paid for both users (husband + wife).
 *
 * Usage:
 *   1) Ensure firebase-admin is installed:
 *        npm install firebase-admin --save-dev
 *   2) Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON
 *      or change initializeApp() below to admin.credential.cert('path/to/key.json').
 *   3) Set PROJECT_ID below to your actual Firebase project id.
 *   4) Run:
 *        node scripts/markBillsPaidUpTo2025-11-14.js
 */

// ---------- CONFIGURE THIS SECTION ----------
const PROJECT_ID = "cashflow-a1c11"; // e.g. "cashflow-a1c11"
const TARGET_EMAILS = [
  "teles.santos.junior@gmail.com",
  "nicolekatr@gmail.com",
];

const TARGET_YEAR = 2025;
const TARGET_MONTH = 11; // November
const CUTOFF_DAY = 14;   // up to and including this day
// -------------------------------------------

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Initialize admin SDK
function initFirebase() {
  // If you have GOOGLE_APPLICATION_CREDENTIALS set, this will just work.
  // Otherwise, replace credential: applicationDefault() with credential: cert("path/to/key.json")
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
  return admin.firestore();
}

async function findUsersByEmail(db) {
  const usersCol = db.collection("users");
  const result = [];

  // Firestore "in" query over profile.email (we only have 2 emails)
  const snap = await usersCol
    .where("profile.email", "in", TARGET_EMAILS)
    .get();

  snap.forEach((doc) => {
    result.push({ id: doc.id, data: doc.data() });
  });

  return result;
}

function buildPaidKeysForBills(bills) {
  const paid = {};

  for (const bill of bills || []) {
    if (bill == null) continue;
    const dueDay = bill.dueDay;
    const billId = bill.id;

    if (typeof dueDay !== "number" || !billId) continue;

    if (dueDay <= CUTOFF_DAY) {
      const dateStr = `${TARGET_YEAR}-${pad2(TARGET_MONTH)}-${pad2(dueDay)}`;
      const key = `${dateStr}:${billId}`;
      paid[key] = true;
    }
  }

  return paid;
}

async function markBillsPaidForUser(db, userDoc) {
  const { id, data } = userDoc;

  const existingData = data.data || {};
  const existingPaid = existingData.paidBills || {};
  const bills = existingData.bills || [];

  console.log(`\nUser ${id} (${data.profile?.email || "no email"})`);
  console.log(`- Bills in data.bills: ${bills.length}`);

  const newPaidMap = buildPaidKeysForBills(bills);
  const numNew = Object.keys(newPaidMap).length;

  if (numNew === 0) {
    console.log("- No bills with dueDay <= 14 found. Nothing to update.");
    return;
  }

  // Merge existing paidBills with new entries
  const mergedPaid = { ...existingPaid, ...newPaidMap };
  const numTotal = Object.keys(mergedPaid).length;

  console.log(`- New paid markers to add: ${numNew}`);
  console.log(`- Total paidBills entries after merge: ${numTotal}`);

  const ref = db.collection("users").doc(id);

  await ref.set(
    {
      data: {
        ...existingData,
        paidBills: mergedPaid,
      },
    },
    { merge: true }
  );

  console.log("- Update DONE ✅");
}

async function main() {
  const db = initFirebase();

  console.log("Looking up users by email:", TARGET_EMAILS);
  const users = await findUsersByEmail(db);

  if (!users.length) {
    console.error("No users found with the target emails. Exiting.");
    process.exit(1);
  }

  console.log(`Found ${users.length} user document(s).`);

  for (const user of users) {
    await markBillsPaidForUser(db, user);
  }

  console.log("\nAll done ✅");
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
