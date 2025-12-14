// src/services/csvScanner.js

/**
 * Downloads a simple CSV template for the user to fill out.
 */
export function downloadBudgetTemplate() {
    const headers = ["Section", "Name", "Total Amount", "Due Day", "User A (Teles)", "User B (Nicole)", "Category"];
    const rows = [
      ["Income", "Husband Salary", "2000.00", "15", "", "", "Salary"],
      ["Income", "Wife Salary", "2000.00", "15", "", "", "Salary"],
      ["Bill", "Rent", "2300.00", "1", "1150.00", "1150.00", "Housing"],
      ["Bill", "Groceries", "400.00", "15", "200.00", "200.00", "Food"]
    ];
  
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
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
    if (!val) return 0;
    if (typeof val === 'number') return val;
    // Remove '$', ',' and other non-numeric chars except '.' and '-'
    const cleaned = val.replace(/[^0-9.-]+/g, "");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  
  /**
   * Parses a CSV file and maps it to the App's import schema.
   */
  export async function parseBudgetCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split("\n").map(line => line.trim()).filter(line => line);
          
          // Skip header
          const dataRows = lines.slice(1);
  
          const result = {
            users: ["User A", "User B"], 
            paySchedule: { frequency: "semi-monthly", payDays: [15, 30] },
            incomes: [],
            expenses: []
          };
  
          dataRows.forEach(row => {
            // Handle simple CSV splitting (ignoring commas inside quotes)
            // Regex splits by comma ONLY if not inside quotes
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, "").trim());
            
            const section = cols[0]?.toLowerCase();
            const name = cols[1];
            const totalAmount = cleanNumber(cols[2]);
            const dayOrFreq = parseInt(cols[3]) || 1;
            const userAAmount = cleanNumber(cols[4]);
            const userBAmount = cleanNumber(cols[5]);
            const category = cols[6] || "Misc";
  
            if (section === "income") {
              result.incomes.push({
                user: name,
                amount: totalAmount
              });
            } else if (section === "bill" || section === "expense") {
              result.expenses.push({
                name: name,
                totalAmount: totalAmount,
                dueDay: dayOrFreq,
                category: category,
                split: {
                  "User A": userAAmount,
                  "User B": userBAmount
                }
              });
            }
          });
  
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