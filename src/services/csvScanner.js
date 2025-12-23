// src/services/csvScanner.js

/**
 * Downloads a simple CSV template for the user to fill out.
 *
 * Notes:
 * - You can optionally include a "PaySchedule" row to explicitly set frequency + pay days.
 *   - Section = PaySchedule
 *   - Name = "semi-monthly" or "monthly"
 *   - Due Day = day1 (1-31)
 *   - User A (Teles) = day2 (1-31) OR "last" (only used when semi-monthly)
 */
export function downloadBudgetTemplate() {
  const headers = [
    "Section",
    "Name",
    "Total Amount",
    "Due Day",
    "User A (Teles)",
    "User B (Nicole)",
    "Category",
  ];

  const rows = [
    // Optional (recommended) explicit schedule:
    ["PaySchedule", "semi-monthly", "", "15", "last", "", ""],

    // Income rows (amount is per paycheck)
    ["Income", "Teles Salary", "2127.08", "15", "", "", "Salary"],
    ["Income", "Nicole Salary", "1990.11", "15", "", "", "Salary"],

    // Bills (Total Amount is the full bill; split columns can be 0/blank)
    ["Bill", "Rent", "2300.00", "15", "1196.00", "1104.00", "Housing"],
    ["Bill", "Groceries", "400.00", "15", "200.00", "200.00", "Food"],
  ];

  const csvEscape = (val) => {
    const s = String(val ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csvContent = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "budget_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper to clean currency strings (e.g. "$2,300.00" -> 2300.00)
 */
function cleanNumber(val) {
  if (val == null || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseDayOrLast(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^last$/i.test(s)) return "last";
  const n = parseInt(s, 10);
  if (Number.isInteger(n) && n >= 1 && n <= 31) return n;
  return null;
}

// Regex splits by comma ONLY if not inside quotes (supports embedded commas).
function splitCsvLine(line) {
  return String(line)
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
}

/**
 * Parses a CSV file and maps it to the app's import schema consumed by Settings.jsx:
 * {
 *   users: ["User A","User B"],
 *   paySchedule: { frequency, payDays: [day1, day2OrLast?] },
 *   incomes: [{ user, amount }],
 *   expenses: [{ name, totalAmount, dueDay, category, split: { "User A": n, "User B": n } }]
 * }
 */
export async function parseBudgetCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? "");
        const lines = text
          .replace(/^\uFEFF/, "") // strip BOM
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length < 2) {
          reject(new Error("CSV is empty or missing data rows."));
          return;
        }

        // Skip header line; we parse by column index for stability with the template.
        const dataRows = lines.slice(1);

        const result = {
          users: ["User A", "User B"],
          // Default schedule if none provided/inferred:
          paySchedule: { frequency: "semi-monthly", payDays: [15, "last"] },
          incomes: [],
          expenses: [],
        };

        let explicitSchedule = null;
        const incomeDayHints = [];

        for (const row of dataRows) {
          const cols = splitCsvLine(row);

          const section = (cols[0] || "").trim().toLowerCase();
          const name = (cols[1] || "").trim();

          // NOTE: for PaySchedule we intentionally re-use existing columns:
          // - Due Day (col 3) => day1
          // - User A (col 4) => day2 (or "last")
          if (
            section === "payschedule" ||
            section === "pay schedule" ||
            section === "schedule"
          ) {
            const freqRaw = (name || "").toLowerCase();
            const frequency =
              freqRaw.includes("month") && !freqRaw.includes("semi")
                ? "monthly"
                : "semi-monthly";

            const day1 = parseDayOrLast(cols[3]) ?? 15;
            const day2 =
              parseDayOrLast(cols[4]) ??
              (frequency === "semi-monthly" ? "last" : null);

            if (frequency === "monthly") {
              explicitSchedule = {
                frequency: "monthly",
                payDays: [day1 === "last" ? "last" : day1],
              };
            } else {
              explicitSchedule = {
                frequency: "semi-monthly",
                payDays: [day1 === "last" ? 15 : day1, day2 || "last"],
              };
            }
            continue;
          }

          const totalAmount = cleanNumber(cols[2]);
          const dueDayRaw = parseDayOrLast(cols[3]);
          const dueDayNum = typeof dueDayRaw === "number" ? dueDayRaw : 1;

          const userAAmount = cleanNumber(cols[4]);
          const userBAmount = cleanNumber(cols[5]);
          const category = (cols[6] || "Misc").trim() || "Misc";

          if (section === "income") {
            // Optional hinting: allow income rows to provide payday day(s).
            // If it's a number or "last", we store it as a hint.
            if (dueDayRaw != null) incomeDayHints.push(dueDayRaw);

            result.incomes.push({
              user: name,
              amount: totalAmount,
            });
          } else if (section === "bill" || section === "expense") {
            result.expenses.push({
              name,
              totalAmount,
              dueDay: dueDayNum,
              category,
              split: {
                "User A": userAAmount,
                "User B": userBAmount,
              },
            });
          }
        }

        // Prefer explicit schedule row if present.
        if (explicitSchedule) {
          result.paySchedule = explicitSchedule;
        } else if (incomeDayHints.length > 0) {
          // Best-effort inference from income "Due Day" column:
          // - If 2+ distinct hints => semi-monthly
          // - If 1 numeric hint => assume semi-monthly with [day1, "last"] (common pattern)
          // - If only "last" => monthly last
          const uniq = Array.from(
            new Set(
              incomeDayHints.map((x) => (typeof x === "string" ? "last" : x))
            )
          );
          const hasLast = uniq.includes("last");
          const nums = uniq
            .filter((x) => typeof x === "number")
            .sort((a, b) => a - b);

          if (hasLast && nums.length === 0) {
            result.paySchedule = { frequency: "monthly", payDays: ["last"] };
          } else if (hasLast && nums.length >= 1) {
            result.paySchedule = {
              frequency: "semi-monthly",
              payDays: [nums[0], "last"],
            };
          } else if (nums.length >= 2) {
            result.paySchedule = {
              frequency: "semi-monthly",
              payDays: [nums[0], nums[1]],
            };
          } else if (nums.length === 1) {
            result.paySchedule = {
              frequency: "semi-monthly",
              payDays: [nums[0], "last"],
            };
          }
        }

        resolve(result);
      } catch (err) {
        console.error("CSV Parse Error:", err);
        reject(new Error("Failed to parse CSV file. Please check the format."));
      }
    };

    reader.onerror = () => reject(new Error("Error reading file."));
    reader.readAsText(file);
  });
}
