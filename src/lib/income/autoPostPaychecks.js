// Pure utility to decide which paycheck transactions should be auto-created.
// No store access or side effects.

const clampDay = (year, monthIndex0, day) => {
  const n = Number.isFinite(+day) ? +day : 1;
  const last = new Date(year, monthIndex0 + 1, 0).getDate();
  if (n < 1) return 1;
  if (n > last) return last;
  return n;
};

const buildPaydaysForMonth = (year, monthIndex0, paySchedule = {}) => {
  const type = paySchedule?.type || "semi-monthly";
  const day1 = clampDay(year, monthIndex0, paySchedule?.day1 ?? 15);
  const rawDay2 = paySchedule?.day2;
  const day2 =
    rawDay2 === "last" || rawDay2 === undefined || rawDay2 === null
      ? new Date(year, monthIndex0 + 1, 0).getDate()
      : clampDay(year, monthIndex0, rawDay2);

  const dates = [];
  if (type === "semi-monthly") {
    dates.push(day1);
    if (day2 !== day1) dates.push(day2);
  } else {
    // Fallback: still emit two dates to stay predictable
    dates.push(day1);
    if (day2 !== day1) dates.push(day2);
  }

  return dates
    .map((d) => new Date(year, monthIndex0, d))
    .sort((a, b) => a - b)
    .map((d) => d.toISOString().slice(0, 10));
};

const toCents = (amount) => Math.round((Number(amount) || 0) * 100);

export function autoPostPaychecks({
  todayISO,
  paySchedule,
  income = {},
  existingTransactions = [],
  depositAccountId = null,
}) {
  const today = new Date(`${todayISO}T00:00:00`);
  if (Number.isNaN(today.getTime())) {
    return { newTransactions: [], debug: { error: "invalid-today" } };
  }

  const year = today.getFullYear();
  const monthIndex0 = today.getMonth();

  // Only consider the current month relative to "today" to keep behavior predictable.
  const candidateDates = buildPaydaysForMonth(year, monthIndex0, paySchedule);

  const existingKeys = new Set();
  existingTransactions.forEach((tx) => {
    if (!tx) return;
    if (tx.id) existingKeys.add(String(tx.id));
    if (tx.sourceKey) existingKeys.add(String(tx.sourceKey));
  });

  const partners = [
    { key: "husband", label: "Salary (H)", amount: toCents(income?.husband) },
    { key: "wife", label: "Salary (W)", amount: toCents(income?.wife) },
  ];

  const newTransactions = [];
  const debug = {
    candidateDates,
    skipped: { future: [], existing: [] },
  };

  candidateDates.forEach((dateStr) => {
    if (dateStr > todayISO) {
      debug.skipped.future.push(dateStr);
      return;
    }

    partners.forEach((partner) => {
      if (!partner.amount || partner.amount <= 0) return;
      const key = `auto-paycheck:${partner.key}:${dateStr}:${partner.amount}:${depositAccountId || "none"}`;
      if (existingKeys.has(key)) {
        debug.skipped.existing.push(key);
        return;
      }

      const tx = {
        id: key,
        source: "auto-paycheck",
        sourceKey: key,
        type: "income",
        category: "salary",
        description: `Auto Salary - ${partner.key.toUpperCase()}`,
        date: dateStr,
        amount: partner.amount / 100,
        accountId: depositAccountId || null,
        createdAt: `${dateStr}T00:00:00.000Z`,
      };
      newTransactions.push(tx);
      existingKeys.add(key);
    });
  });

  return { newTransactions, debug };
}

export default autoPostPaychecks;
