import { describe, test, expect } from "bun:test";
import { STOCK_GROUPS, parseStockGrams, nextStockGrams } from "./gold-stock";

describe("Office stock in grams", () => {
  test("supports exactly A, B, and C", () => {
    expect(STOCK_GROUPS.map((x) => x.group)).toEqual(["A", "B", "C"]);
  });
  test("accepts decimal grams without a traditional unit conversion", () => {
    expect(parseStockGrams("16.6")).toBe(16.6);
    expect(parseStockGrams("1 ကျပ်")).toBeNull();
  });
  test("adding incoming stock increases the current grams", () => {
    expect(nextStockGrams(100, 25.5, "add")).toBe(125.5);
  });
  test("updating replaces current grams", () => {
    expect(nextStockGrams(100, 25.5, "set")).toBe(25.5);
  });
  test("rejects negative, blank, and nonfinite stock", () => {
    for (const value of ["-1", "", "NaN", "Infinity", "1e999"]) expect(parseStockGrams(value)).toBeNull();
    expect(parseStockGrams("0")).toBe(0);
  });
});