// scripts/markBillsPaidUpTo2025-11-14.js
// ES module version (works with "type": "module" in package.json)

import { getDb } from "./adminClient.js";

/**
 * One-off script to mark all bills with dueDay <= 14 in November 2025
 * as paid for both users (husband + wife).
 *
 * Usage:
 *   1) Ensure firebase-admin is installed (dev dependency already present).
 *   2) Provide credentials via one of:
 *        - FIREBASE_SERVICE_ACCOUNT_BASE64 (base64-encoded JSON)
 *        - FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON string)
 *        - GOOGLE_APPLICATION_CREDENTIALS (path to JSON file)
 *      Optionally set FIREBASE_PROJECT_ID to override project id.
 *   3) Run:
 *        node scripts/markBillsPaidUpTo2025-11-14.js
 */

// ---------- CONFIGURE THIS SECTION ----------
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
  const db = getDb();

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
