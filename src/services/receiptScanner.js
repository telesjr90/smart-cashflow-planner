// src/services/receiptScanner.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// MODEL LIST
// Prioritize the experimental 2.0, then fall back to stable 1.5 versions.
const MODELS = [
  "gemini-2.0-flash-exp",   // Try the experimental flash model first
  "gemini-1.5-flash",       // Stable fast model
  "gemini-1.5-flash-8b",    // Ultra-lightweight fallback
  "gemini-1.5-pro"          // Last resort (slower/heavier)
];

/**
 * Converts a File object to a Base64 object for Gemini.
 */
async function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(",")[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Simple delay helper to handle rate limit backoff.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scans a receipt image with robust fallback logic.
 */
export async function scanReceipt(imageFile, categories, accounts) {
  const imagePart = await fileToGenerativePart(imageFile);

  const categoryContext = categories.map((c) => `${c.id} (${c.label})`).join(", ");
  const accountContext = accounts.map((a) => `${a.id} (${a.name})`).join(", ");

  const prompt = `
    Analyze this receipt image and extract transaction details.
    
    1. **Total Amount**: Find the final total.
    2. **Date**: Format YYYY-MM-DD. If missing, use today's date.
    3. **Description**: Merchant name and brief items summary.
    4. **Category**: Choose the best match from these IDs: [${categoryContext}]. Return 'other' if unsure.
    5. **Account**: If the receipt shows card digits (e.g. "Visa 1234"), try to match with these accounts: [${accountContext}]. Return null if no match found.

    Return ONLY a raw JSON object (no markdown, no code blocks) with this structure:
    {
      "amount": number,
      "date": "string",
      "description": "string",
      "categoryId": "string",
      "accountId": "string" | null
    }
  `;

  return executeGeminiRequest(prompt, imagePart);
}

/**
 * Scans a "Cash Flow Snapshot" dashboard image.
 * Extracts Income, Pay Schedule, and Bill Splits from the dual-column layout.
 */
export async function scanBudgetSheet(imageFile) {
  const imagePart = await fileToGenerativePart(imageFile);

  const prompt = `
    Analyze this "Monthly Bill Split - Household Cash Flow Snapshot" image. 
    It is divided into two pay periods (Paycheck #1 and Paycheck #2) and contains Income, Summaries, and Bill Tables.

    **Goal**: Extract configuration data to set up a smart budget app.

    **Extraction Rules**:
    1. **Users**: Identify the two people listed in the Income/Bill columns (e.g. Teles, Nicole).
    2. **Pay Schedule**: Extract the trigger days for the two paychecks (e.g., 15th, 30th).
    3. **Income**: Extract the recurring income amount for each user.
    4. **Expenses (Bills/Budgets)**: 
       - Combine the rows from BOTH "Bill-by-Bill Split" tables (1st-14th AND 15th-EOM).
       - **Columns**: The tables usually follow this order: [Name] | [Total Amount] | [User A Portion] | [User B Portion].
       - **Due Date**: If the name has a date like "Rent (15th)", use 15. If not, infer roughly from the period (e.g. 1st for the first table, 15th for the second).
       - **Category**: Infer a simple category (e.g., "Housing", "Utility", "Food", "Subscription") based on the name.

    **Return JSON Only (No Markdown)**:
    {
      "users": ["Name1", "Name2"],
      "paySchedule": {
        "frequency": "semi-monthly",
        "payDays": [number, number] 
      },
      "incomes": [
        { "user": "Name1", "amount": number },
        { "user": "Name2", "amount": number }
      ],
      "expenses": [
        {
          "name": "string",
          "category": "string", 
          "totalAmount": number,
          "dueDay": number,
          "split": {
            "Name1": number,
            "Name2": number
          }
        }
      ]
    }
  `;

  return executeGeminiRequest(prompt, imagePart);
}

/**
 * Helper to execute Gemini requests with model fallback logic.
 */
async function executeGeminiRequest(prompt, imagePart) {
  for (const modelName of MODELS) {
    try {
      console.log(`Scanning with model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Robust JSON extraction: Finds the first '{' and the last '}'
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      
      const cleanedText = jsonMatch[0];
      
      console.log(`Success with ${modelName}`);
      return JSON.parse(cleanedText);

    } catch (error) {
      console.warn(`Failed with ${modelName}:`, error.message);

      // Add a small delay if we hit a rate limit (429) before trying the next model
      if (error.message.includes("429")) {
        console.log("Rate limit hit, waiting 2s before retry...");
        await delay(2000);
      }

      // If this was the last model, throw error
      if (modelName === MODELS[MODELS.length - 1]) {
        if (error.message.includes("429") || error.message.includes("quota")) {
          throw new Error("Free tier usage limit exceeded. Please try again in a few minutes.");
        }
        if (error.message.includes("404")) {
          throw new Error("AI Service unavailable (Models not found). Check your API Key.");
        }
        throw new Error("Could not scan image. The AI response was not valid JSON.");
      }
    }
  }
}