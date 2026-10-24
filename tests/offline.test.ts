import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  getDemo,
  executeDemo,
  putLocal,
  saveGrant,
  recordOffline,
  receipts,
  markReceipt,
} from "../src/lib/storage";
import type { Grant } from "../src/domain/types";
const key = "test:offline",
  grant: Grant = {
    id: "grant-one",
    terminal_id: "terminal",
    user_id: "user",
    store_id: "store",
    created_at: new Date().toISOString(),
    status: "ACTIVE",
    last_sequence: 0,
    lines: [
      {
        id: "line",
        variant_id: "cable",
        quantity: 1,
        consumed: 0,
        price: 90000,
        name: "Cáp",
        sku: "CAP",
        mode: "QUANTITY",
        warranty_days: 30,
      },
    ],
  };
const identity = { store: "store", user: "user", terminal: "terminal" },
  lines = [{ variant_id: "cable", quantity: 1, price: 90000, discount: 0 }];
describe("durable local receipts", () => {
  it("initializes demo once before issuing identifiers", async () => {
    const [a, b] = await Promise.all([getDemo(), getDemo()]);
    expect(a.products[0].id).toBe(b.products[0].id);
    const p = a.products.find((x) => x.mode === "QUANTITY")!;
    await expect(
      executeDemo({
        request_id: crypto.randomUUID(),
        operation: "sale",
        payload: {
          lines: [
            { variant_id: p.id, quantity: 1, price: p.price, discount: 0 },
          ],
          payments: [{ method: "CASH", amount: p.price }],
        },
      }),
    ).resolves.toHaveProperty("code");
  });
  it("two simultaneous tabs cannot consume the same last quota", async () => {
    await saveGrant(key, grant);
    const results = await Promise.allSettled([
      recordOffline(key, identity, lines, 100000),
      recordOffline(key, identity, lines, 100000),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const all = await receipts(key);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      sequence: 1,
      total: 90000,
      change: 10000,
      status: "PENDING",
    });
    expect((await receipts(key))[0].id).toBe(all[0].id);
  });
  it("ACK update cannot erase a new receipt from another transaction", async () => {
    const old = (await receipts(key))[0];
    await saveGrant(key, {
      ...grant,
      lines: [{ ...grant.lines[0], quantity: 2 }],
    });
    await Promise.all([
      markReceipt(key, old.id, { status: "POSTED", server_code: "BH1" }),
      recordOffline(key, identity, lines, 90000),
    ]);
    const all = await receipts(key);
    expect(all).toHaveLength(2);
    expect(all[0].server_code).toBe("BH1");
    expect(all[1].sequence).toBe(2);
  });
  it("cannot replace a grant with unsynced physical sales or roll sequence back", async () => {
    await expect(saveGrant(key, { ...grant, id: "new" })).rejects.toThrow(
      "chưa đồng bộ",
    );
    await putLocal(`grant:${key}`, { ...grant, last_sequence: 2 });
    await expect(
      saveGrant(key, { ...grant, last_sequence: 1 }),
    ).rejects.toThrow("lùi");
  });
});
