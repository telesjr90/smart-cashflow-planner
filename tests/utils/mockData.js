export const mockUser = {
    uid: "test-user-123",
    email: "test@example.com",
    displayName: "Test User",
  };
  
  export const mockFirestoreData = {
    // This mirrors the "data" field in your Firestore user document
    bills: [
      { id: "b1", name: "Test Rent", amount: 2000, dueDay: 1, payer: "H", paid: true },
      { id: "b2", name: "Test Internet", amount: 80, dueDay: 15, payer: "W", paid: false }
    ],
    accounts: [
      { id: "acc1", name: "Main Chequing", type: "deposit", openingBalance: 5000 }
    ],
    income: { husband: 3000, wife: 3000 },
    paySchedule: { type: "semi-monthly", day1: 15, day2: "last" },
    expenses: [],
    goals: [{ id: "g1", name: "Vacation", targetAmount: 2000, savedSoFar: 500 }],
    categoryBudgets: { "groceries": { amount: 600 } }
  };