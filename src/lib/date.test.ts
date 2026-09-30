import { describe, expect, test } from "bun:test";
import { dateFromIso, formatDate, isoFromDate, parseDateInput } from "./date";

describe("UK date utilities", () => {
  test("formats database dates and timestamps as dd/mm/yyyy", () => {
    expect(formatDate("2026-09-27")).toBe("27/09/2026");
    expect(formatDate("2026-09-27T18:30:00.000Z")).toBe("27/09/2026");
  });

  test("parses valid UK dates to database format", () => {
    expect(parseDateInput("27/09/2026")).toBe("2026-09-27");
    expect(parseDateInput("29/02/2028")).toBe("2028-02-29");
  });

  test("rejects invalid or non-UK dates", () => {
    expect(parseDateInput("09/27/2026")).toBeNull();
    expect(parseDateInput("29/02/2026")).toBeNull();
    expect(formatDate("2026-02-29")).toBe("—");
  });

  test("converts calendar dates without changing the local day", () => {
    const date = dateFromIso("2026-09-27");
    expect(date ? isoFromDate(date) : null).toBe("2026-09-27");
  });
});