// seedBills.js
// One-time script to seed bills + initial paidBills into Firestore
// Run with: node seedBills.js

const admin = require("firebase-admin");
const path = require("path");

// 1. Point this to your downloaded service account key JSON
const serviceAccount = require("./serviceAccountKey.json");

// 2. Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 3. List all user IDs you want to seed (from Firebase Auth)
const USER_IDS = [
  "PEu94mcBNdPVba2y2BYfYZm5EHP2",
  "Mg8RD7GHO1ezqJLiuiAYoif0M5b2",
  // add more if needed
];

// 4. Bills array – final assignment (payer: 'H' for Teles, 'W' for Nicole)
const bills = [
  {
    id: "b1",
    name: "Psicologa Nicole 2",
    amount: 150.0,
    dueDay: 1,
    payer: "W", // Nicole
    category: "healthcare",
  },
  {
    id: "b2",
    name: "Compass Nicole",
    amount: 111.6,
    dueDay: 1,
    payer: "W",
    category: "healthcare",
  },
  {
    id: "b3",
    name: "RBC Fee Nicole",
    amount: 11.95,
    dueDay: 1,
    payer: "W", // assigned fully to Nicole
    category: "other",
  },
  {
    id: "b4",
    name: "Psicologa Nicole",
    amount: 150.0,
    dueDay: 1,
    payer: "W",
    category: "healthcare",
  },
  {
    id: "b5",
    name: "Account Fee TD Nicole",
    amount: 17.95,
    dueDay: 1,
    payer: "W",
    category: "other",
  },
  {
    id: "b6",
    name: "Compass Teles",
    amount: 149.25,
    dueDay: 1,
    payer: "H", // Teles
    category: "healthcare",
  },
  {
    id: "b7",
    name: "Emprestimo M",
    amount: 381.4,
    dueDay: 1,
    payer: "H",
    category: "other",
  },
  {
    id: "b8",
    name: "BC Hydro",
    amount: 33.0,
    dueDay: 1,
    payer: "H",
    category: "housing",
  },
  {
    id: "b9",
    name: "Psicologa Teles",
    amount: 280.0,
    dueDay: 1,
    payer: "H",
    category: "healthcare",
  },
  {
    id: "b10",
    name: "Amazon Prime",
    amount: 11.19,
    dueDay: 1,
    payer: "H",
    category: "entertainment",
  },
  {
    id: "b11",
    name: "OnePassword",
    amount: 8.9,
    dueDay: 1,
    payer: "H",
    category: "other",
  },
  {
    id: "b12",
    name: "Microsoft",
    amount: 16.25,
    dueDay: 1,
    payer: "H",
    category: "other",
  },
  {
    id: "b13",
    name: "CCS",
    amount: 332.0,
    dueDay: 1,
    payer: "H",
    category: "debt",
  },
  {
    id: "b14",
    name: "Maconha",
    amount: 90.0,
    dueDay: 1,
    payer: "H",
    category: "healthcare",
  },
  {
    id: "b15",
    name: "Lilo comida",
    amount: 75.0,
    dueDay: 1,
    payer: "H",
    category: "groceries",
  },
  {
    id: "b16",
    name: "Lilo remedio",
    amount: 100.0,
    dueDay: 1,
    payer: "H",
    category: "healthcare",
  },
  {
    id: "b17",
    name: "Lilo unha",
    amount: 70.0,
    dueDay: 1,
    payer: "H",
    category: "healthcare",
  },
  {
    id: "b18",
    name: "Dropout",
    amount: 7.65,
    dueDay: 1,
    payer: "H",
    category: "entertainment",
  },
  {
    id: "b19",
    name: "Feira 15",
    amount: 400.0,
    dueDay: 15,
    payer: "H",
    category: "groceries",
  },
  {
    id: "b20",
    name: "Nicole Rent Ptn",
    amount: 2055.61,
    dueDay: 15,
    payer: "W",
    category: "housing",
  },
  {
    id: "b21",
    name: "Teles Rent Ptn",
    amount: 244.39,
    dueDay: 15,
    payer: "H",
    category: "housing",
  },
  {
    id: "b22",
    name: "Telus",
    amount: 81.76,
    dueDay: 20,
    payer: "H",
    category: "housing",
  },
  {
    id: "b23",
    name: "Koodo",
    amount: 94.63,
    dueDay: 28,
    payer: "W",
    category: "housing",
  },
  {
    id: "b24",
    name: "Feira 30",
    amount: 400.0,
    dueDay: 30,
    payer: "H",
    category: "groceries",
  },
  {
    id: "b25",
    name: "Instacart",
    amount: 11.19,
    dueDay: 15,
    payer: "W", // assigned to Nicole
    category: "groceries",
  },
  {
    id: "b26",
    name: "Square One",
    amount: 50.61,
    dueDay: 16,
    payer: "H", // assigned to Teles
    category: "housing",
  },
  {
    id: "b27",
    name: "Spotify",
    amount: 20.04,
    dueDay: 25,
    payer: "W", // assigned to Nicole
    category: "entertainment",
  },
];

// 5. paidBills in ENGINE SHAPE: "YYYY-MM-DD:billId" => true
// "Up to November 14th" = all the dueDay = 1 bills
const paidBills = {
  "2025-11-01:b1": true,
  "2025-11-01:b2": true,
  "2025-11-01:b3": true,
  "2025-11-01:b4": true,
  "2025-11-01:b5": true,
  "2025-11-01:b6": true,
  "2025-11-01:b7": true,
  "2025-11-01:b8": true,
  "2025-11-01:b9": true,
  "2025-11-01:b10": true,
  "2025-11-01:b11": true,
  "2025-11-01:b12": true,
  "2025-11-01:b13": true,
  "2025-11-01:b14": true,
  "2025-11-01:b15": true,
  "2025-11-01:b16": true,
  "2025-11-01:b17": true,
  "2025-11-01:b18": true,
};

async function seedUser(uid) {
  const ref = db.collection("users").doc(uid);

  // Use dot-paths so we only update these two branches under `data`
  const payload = {
    "data.bills": bills,
    "data.paidBills": paidBills,
    // We deliberately DO NOT set data.startingBalance here.
  };

  console.log(`Seeding bills/paidBills for user ${uid} ...`);
  await ref.set(payload, { merge: true });
  console.log(`✅ Done for ${uid}`);
}

async function run() {
  try {
    for (const uid of USER_IDS) {
      await seedUser(uid);
    }
    console.log("🎉 All done.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding bills:", err);
    process.exit(1);
  }
}

run();
