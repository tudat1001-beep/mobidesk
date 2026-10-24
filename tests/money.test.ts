import { describe, it, expect } from "vitest";
import { allocate, cartTotal, isImei } from "../src/domain/money";
import { applyDemo, seedDemo } from "../src/domain/demo";
describe("money and domain invariants", () => {
  it("allocates exact VND and preserves remainder", () => {
    expect(allocate(1, [1, 1, 1])).toEqual([1, 0, 0]);
    expect(
      allocate(10001, [29990000, 149000, 99000]).reduce((a, b) => a + b, 0),
    ).toBe(10001);
    expect(() => allocate(1, [0, 0])).toThrow();
    expect(() =>
      cartTotal([{ quantity: 1, price: 100, discount: 101 }]),
    ).toThrow();
  });
  it("validates IMEI across slots without coercing codes", () => {
    expect(isImei("490154203237518")).toBe(true);
    expect(isImei("490154203237519")).toBe(false);
    expect(isImei("SN-TEST-0001")).toBe(false);
  });
  it("demo stock failure rolls back and replay never duplicates a receipt", () => {
    const s = seedDemo(),
      p = s.products.find((x) => x.mode === "QUANTITY")!,
      payload = {
        party_id: s.parties.find((p) => p.type === "CUSTOMER")!.id,
        lines: [{ variant_id: p.id, quantity: 1, price: p.price, discount: 0 }],
        payments: [],
      },
      request = { request_id: crypto.randomUUID(), operation: "sale", payload };
    const first = applyDemo(s, request),
      again = applyDemo(first.state, request);
    expect(again.state.documents.length).toBe(first.state.documents.length);
    expect(() =>
      applyDemo(s, {
        ...request,
        payload: {
          ...payload,
          lines: [
            { variant_id: p.id, quantity: 99999, price: p.price, discount: 0 },
          ],
        },
      }),
    ).toThrow();
    expect(s.documents.length).toBe(first.state.documents.length - 1);
  });
});
