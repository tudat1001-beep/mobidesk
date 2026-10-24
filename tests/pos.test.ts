import { describe, expect, it } from "vitest";
import {
  emptyDraft,
  parseVnd,
  paymentAmounts,
  matchesParty,
  readSalesDraft,
} from "../src/lib/pos";
describe("POS input", () => {
  it("finds customers without accents or phone separators", () => {
    const p = { name: "Nguyễn Hoàng Anh", phone: "0938 456 789" };
    expect(matchesParty(p, "nguyen hoang")).toBe(true);
    expect(matchesParty(p, "0938456789")).toBe(true);
    expect(matchesParty(p, "khong co")).toBe(false);
  });
  it("accepts integer VND and Vietnamese grouping without reinterpreting decimals or negative values", () => {
    expect(parseVnd("14.990.000")).toBe(14990000);
    expect(parseVnd("149000")).toBe(149000);
    expect(parseVnd("")).toBe(0);
    expect(Number.isNaN(parseVnd('',true))).toBe(true);
    for (const value of ["1.5", "1,5", "-1000", "1e6", "1000000000001"])
      expect(Number.isNaN(parseVnd(value))).toBe(true);
  });
  it("fills only the remainder as cash for split payments and recalculates exact transfers", () => {
    expect(paymentAmounts("SPLIT", 149000, "", "100000")).toEqual({
      cashPaid: 49000,
      bankPaid: 100000,
    });
    expect(paymentAmounts("BANK", 139000, "0", "")).toEqual({
      cashPaid: 0,
      bankPaid: 139000,
    });
    expect(paymentAmounts("CREDIT", 149000, "50000", "0")).toEqual({
      cashPaid: 50000,
      bankPaid: 0,
    });
    expect(paymentAmounts("SPLIT", 149000, "", "NaN").cashPaid).toBe(0);
  });
  it("restores a draft while rejecting corrupt amounts or incomplete records", () => {
    const draft = {
      ...emptyDraft(),
      cart: [{ variant_id: "sku", quantity: 2, price: 149000, discount: 0 }],
      method: "SPLIT",
      bank: "100000",
    };
    expect(
      readSalesDraft({ getItem: () => JSON.stringify(draft) }, "sale"),
    ).toEqual(draft);
    for (const value of [
      "{",
      JSON.stringify({
        ...draft,
        cart: [{ variant_id: "sku", quantity: 1, price: null, discount: 0 }],
      }),
      JSON.stringify({ ...draft, cash: "-5" }),
    ])
      expect(readSalesDraft({ getItem: () => value }, "sale")).toEqual(
        emptyDraft(),
      );
  });
});
