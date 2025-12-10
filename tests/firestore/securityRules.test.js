import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const RULES_PATH = path.join(process.cwd(), "firestore.rules");

describe("Firestore rules sanity", () => {
  it("exists and is readable", () => {
    const exists = fs.existsSync(RULES_PATH);
    expect(exists).toBe(true);
    const contents = fs.readFileSync(RULES_PATH, "utf8");
    expect(contents.length).toBeGreaterThan(50);
  });

  it("allows household-scoped user reads via householdId filter", () => {
    const rules = fs.readFileSync(RULES_PATH, "utf8");
    expect(rules).toMatch(/isHouseholdShared/);
    expect(rules).toMatch(/allow read: if isOwner\(userId\) \|\| isHouseholdShared/);
  });

  it("rejects service account key exposure and locks sensitive paths", () => {
    const rules = fs.readFileSync(RULES_PATH, "utf8");
    // Ensure admin-only or deny access patterns exist
    expect(rules).toMatch(/allow read, write: if false/);
    expect(rules.toLowerCase()).not.toMatch(/serviceaccountkey/i);
  });
});
