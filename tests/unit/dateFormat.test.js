import { describe, it, expect } from "vitest";
import { formatDateShort, formatDateLong, formatMonthYear, formatDateISO } from "../../src/utils/dateFormat.js";

describe("dateFormat utilities", () => {
  it("formats short date", () => {
    expect(formatDateShort("2025-03-15")).toContain("Mar");
  });

  it("formats long date", () => {
    const formatted = formatDateLong("2025-03-15");
    expect(formatted.toLowerCase()).toContain("mar");
    expect(formatted).toMatch(/\d{1,2}/);
  });

  it("formats month and year", () => {
    expect(formatMonthYear("2025-12-01")).toContain("2025");
  });

  it("handles iso formatting", () => {
    expect(formatDateISO("2025-07-04")).toBe("2025-07-04");
    expect(formatDateISO(new Date("2025-07-04T12:00:00Z")).startsWith("2025-07-04")).toBe(true);
  });

  it("returns empty string for invalid inputs", () => {
    expect(formatDateShort("invalid")).toBe("");
    expect(formatDateLong(null)).toBe("");
    expect(formatMonthYear(undefined)).toBe("");
    expect(formatDateISO("bad")).toBe("");
  });
});
