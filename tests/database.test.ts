import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const owner = "11111111-1111-4111-8111-111111111111",
  staff = "22222222-2222-4222-8222-222222222222",
  outsider = "33333333-3333-4333-8333-333333333333";
let db: PGlite,
  store: string,
  quantity: string,
  phone: string,
  supplier: string,
  customer: string;
async function identity(id: string) {
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
  await db.exec("set role authenticated");
}
async function command(
  op: string,
  p: Record<string, unknown>,
  request = randomUUID(),
) {
  const r = await db.query<{ result: Record<string, any> }>(
    "select public.app_execute($1,$2,$3,$4::jsonb) result",
    [store, request, op, JSON.stringify(p)],
  );
  return r.rows[0].result;
}
async function snap() {
  return (
    await db.query<{ result: Record<string, any> }>(
      "select public.app_snapshot($1) result",
      [store],
    )
  ).rows[0].result;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid()to authenticated;insert into auth.users values('${owner}','owner@test.vn'),('${staff}','staff@test.vn'),('${outsider}','other@test.vn');`,
  );
  const migration = await readFile(
    new URL("../supabase/migrations/202610240001_core.sql", import.meta.url),
    "utf8",
  );
  try {
    await db.exec(migration);
  } catch (e) {
    const error = e as {
      position?: string;
      internalPosition?: string;
      internalQuery?: string;
      where?: string;
    };
    const at = Number(error.position || 0);
    console.error({
      position: at,
      context: migration.slice(Math.max(0, at - 250), at + 250),
      internalQuery: error.internalQuery,
      where: error.where,
    });
    throw e;
  }
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610240002_reports.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610240003_history.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await identity(owner);
  store = (
    await db.query<{ id: string }>(
      "select public.app_create_store('Cửa hàng kiểm thử')id",
    )
  ).rows[0].id;
  await command("settings", {
    name: "Cửa hàng kiểm thử",
    tax_note: "Giá quản trị đã được xác nhận cho kiểm thử.",
    policies_approved: true,
  });
  supplier = (
    await command("party", { name: "Nhà cung cấp", type: "SUPPLIER" })
  ).id;
  customer = (await command("party", { name: "Khách hàng", type: "CUSTOMER" }))
    .id;
  quantity = (
    await command("product", {
      sku: "CAP-01",
      name: "Cáp",
      mode: "QUANTITY",
      price: 90000,
    })
  ).id;
  phone = (
    await command("product", {
      sku: "IP-01",
      name: "Điện thoại",
      mode: "IMEI",
      price: 12000000,
    })
  ).id;
}, 60000);
afterAll(async () => {
  await db?.close();
});
describe("Supabase PostgreSQL business functions", () => {
  it("opening stock and debt do not create sales or cash, and cross-store IDs are rejected", async () => {
    const originalStore = store;
    await identity(outsider);
    await expect(
      db.query("select public.app_create_store('Không được tự tạo thêm')"),
    ).rejects.toThrow("đã có cửa hàng");
    await db.exec("reset role");
    store = (
      await db.query<{ id: string }>(
        "insert into app_private.stores(name)values('Fixture B để thử cách ly FK')returning id",
      )
    ).rows[0].id;
    await db.query(
      "insert into app_private.store_members values($1,$2,'OWNER',true)",
      [store, outsider],
    );
    await identity(outsider);
    try {
      await command("settings", {
        name: "Cửa hàng B",
        tax_note: "Chính sách thử nghiệm được xác nhận.",
        policies_approved: true,
      });
      const p = (
          await command("product", {
            name: "Cáp B",
            sku: "B-CAP",
            mode: "QUANTITY",
            price: 100,
          })
        ).id,
        c = (await command("party", { name: "Khách B", type: "CUSTOMER" })).id;
      await command("opening", {
        lines: [{ variant_id: p, quantity: 5, price: 40 }],
        payments: [],
      });
      const debt = await command("opening", {
        opening_side: "AR",
        party_id: c,
        balance: 1000,
      });
      let s = await snap();
      expect(s.balances[0].value).toBe(200);
      expect(s.parties[0].ar).toBe(1000);
      expect(s.documents.flatMap((d: any) => d.payments)).toHaveLength(0);
      await command("payment", {
        document_id: debt.id,
        amount: 300,
        method: "CASH",
      });
      expect((await snap()).parties[0].ar).toBe(700);
      await expect(
        command("purchase", {
          party_id: c,
          lines: [{ variant_id: quantity, quantity: 1, price: 10 }],
          payments: [],
        }),
      ).rejects.toThrow("cửa hàng");
      await command("close_opening", {});
      await expect(
        command("opening", {
          lines: [{ variant_id: p, quantity: 1, price: 40 }],
          payments: [],
        }),
      ).rejects.toThrow("đầu");
    } finally {
      store = originalStore;
      await identity(owner);
    }
  });
  it("weighted average, mixed payment, debt and original-cost return", async () => {
    await command("purchase", {
      party_id: supplier,
      lines: [
        { variant_id: quantity, quantity: 10, price: 50000, discount: 0 },
      ],
      payments: [],
    });
    await command("purchase", {
      party_id: supplier,
      lines: [
        { variant_id: quantity, quantity: 10, price: 70000, discount: 0 },
      ],
      payments: [],
    });
    const sale = await command("sale", {
      party_id: customer,
      lines: [{ variant_id: quantity, quantity: 3, price: 90000, discount: 0 }],
      payments: [{ method: "CASH", amount: 100000 }],
    });
    let state = await snap(),
      d = state.documents.find((x: any) => x.id === sale.id);
    expect(d.cost).toBe(180000);
    expect(d.balance).toBe(170000);
    await command("purchase", {
      party_id: supplier,
      lines: [{ variant_id: quantity, quantity: 3, price: 80000, discount: 0 }],
      payments: [],
    });
    await command("return", {
      document_id: d.id,
      lines: [{ line_id: d.lines[0].id, quantity: 1 }],
      refund: 0,
    });
    state = await snap();
    expect(
      state.balances.find((b: any) => b.variant_id === quantity),
    ).toMatchObject({ available: 20, quarantine: 1, value: 1320000 });
    expect(state.documents.find((x: any) => x.id === sale.id).balance).toBe(
      80000,
    );
  });
  it("idempotency and different payload rejection", async () => {
    const request = randomUUID(),
      p = {
        party_id: customer,
        lines: [
          { variant_id: quantity, quantity: 1, price: 90000, discount: 0 },
        ],
        payments: [],
      };
    const a = await command("sale", p, request),
      b = await command("sale", p, request);
    expect(a).toEqual(b);
    await expect(
      command("sale", { ...p, note: "changed" }, request),
    ).rejects.toThrow("nội dung khác");
  });
  it("cross-slot IMEI uniqueness and no partial purchase", async () => {
    await command("purchase", {
      party_id: supplier,
      lines: [
        {
          variant_id: phone,
          quantity: 1,
          price: 10000000,
          discount: 0,
          identifier: "490154203237518",
          imei2: "356938035643809",
        },
      ],
      payments: [],
    });
    const before = (await snap()).documents.length;
    await expect(
      command("purchase", {
        party_id: supplier,
        lines: [
          { variant_id: quantity, quantity: 1, price: 50000 },
          {
            variant_id: phone,
            quantity: 1,
            price: 10000000,
            identifier: "356938035643809",
          },
        ],
        payments: [],
      }),
    ).rejects.toThrow("tồn tại");
    const after = await snap();
    expect(after.documents.length).toBe(before);
  });
  it("rejects missing and empty lines, overstock and duplicate units", async () => {
    await expect(command("sale", { payments: [] })).rejects.toThrow();
    await expect(
      command("sale", { lines: [], payments: [] }),
    ).rejects.toThrow();
    await expect(
      command("sale", {
        party_id: customer,
        lines: [{ variant_id: quantity, quantity: 999, price: 90000 }],
        payments: [],
      }),
    ).rejects.toThrow("đủ tồn");
    const u = (await snap()).units[0];
    await expect(
      command("sale", {
        party_id: customer,
        lines: [
          { variant_id: phone, unit_id: u.id, quantity: 1, price: 12000000 },
          { variant_id: phone, unit_id: u.id, quantity: 1, price: 12000000 },
        ],
        payments: [],
      }),
    ).rejects.toThrow("sẵn sàng");
    expect((await snap()).units[0].status).toBe("AVAILABLE");
  });
  it("protects tables, tenant and costs for staff", async () => {
    await command("member", {
      email: "staff@test.vn",
      role: "STAFF",
      active: true,
    });
    await identity(staff);
    const s = await snap();
    expect(s.units[0]).not.toHaveProperty("cost");
    expect(s.balances[0]).not.toHaveProperty("value");
    expect(
      s.documents.every(
        (d: any) => !("cost" in d) && d.lines.every((l: any) => !("cost" in l)),
      ),
    ).toBe(true);
    await expect(
      db.query("select * from app_private.documents"),
    ).rejects.toThrow();
    await expect(command("settings", { name: "Hack" })).rejects.toThrow(
      "chủ cửa hàng",
    );
    await identity(outsider);
    await expect(snap()).rejects.toThrow("NO_STORE");
    await identity(owner);
  });
  it("reserves offline stock, consumes once and releases only remaining quota", async () => {
    const terminal = randomUUID();
    const g = await command("grant", {
      terminal_id: terminal,
      lines: [{ variant_id: quantity, quantity: 2 }],
    });
    let state = await snap();
    const before = state.balances.find((b: any) => b.variant_id === quantity);
    expect(before.reserved).toBe(2);
    const local = randomUUID();
    const payload = {
      grant_id: g.id,
      terminal_id: terminal,
      user_id: owner,
      local_id: local,
      sequence: 1,
      occurred_at: new Date().toISOString(),
      lines: [{ variant_id: quantity, quantity: 1, price: 90000 }],
      payments: [{ method: "CASH", amount: 90000 }],
    };
    const a = await command("sale", payload, local),
      b = await command("sale", payload, local);
    expect(a).toEqual(b);
    state = await snap();
    expect(
      state.balances.find((b: any) => b.variant_id === quantity).reserved,
    ).toBe(1);
    await expect(
      command("adjust", {
        variant_id: quantity,
        count: 1,
        version: state.store.version,
        note: "Kiểm kê",
      }),
    ).rejects.toThrow("offline");
    await command("release_grant", { grant_id: g.id, last_sequence: 1 });
    expect(
      (await snap()).balances.find((b: any) => b.variant_id === quantity)
        .reserved,
    ).toBe(0);
  });
  it("exchange rolls the return back when the replacement is unavailable", async () => {
    const sale = await command("sale", {
      party_id: customer,
      lines: [{ variant_id: quantity, quantity: 1, price: 90000 }],
      payments: [{ method: "CASH", amount: 90000 }],
    });
    const s = await snap(),
      d = s.documents.find((d: any) => d.id === sale.id),
      before = s.documents.length;
    await expect(
      command("exchange", {
        document_id: d.id,
        lines: [{ line_id: d.lines[0].id, quantity: 1 }],
        new_lines: [{ variant_id: quantity, quantity: 99999, price: 90000 }],
        payments: [],
        refund: 0,
      }),
    ).rejects.toThrow("tồn");
    expect((await snap()).documents.length).toBe(before);
    await command("exchange", {
      document_id: d.id,
      lines: [{ line_id: d.lines[0].id, quantity: 1 }],
      new_lines: [{ variant_id: quantity, quantity: 1, price: 100000 }],
      payments: [{ method: "CASH", amount: 10000 }],
      refund: 0,
    });
    const after = await snap();
    expect(after.documents.find((x: any) => x.id === sale.id).balance).toBe(0);
    expect(
      after.documents.find(
        (x: any) => x.kind === "SALE" && x.note.startsWith("Đổi từ"),
      ).balance,
    ).toBe(0);
  });
  it("keeps historical sale prices when changing catalog prices and enforces unique barcodes", async () => {
    const before = await snap();
    const priorSale = before.documents.find((d: any) => d.kind === "SALE");
    await command("product_update", {
      variant_id: quantity,
      price: 92000,
      min_stock: 4,
      warranty_days: 30,
      barcode: "893000000001",
    });
    const after = await snap();
    expect(after.products.find((p: any) => p.id === quantity).barcode).toBe(
      "893000000001",
    );
    expect(
      after.documents.find((d: any) => d.id === priorSale.id).lines,
    ).toEqual(priorSale.lines);
    await expect(
      command("product", {
        sku: "DUPBAR",
        name: "Trùng mã vạch",
        mode: "QUANTITY",
        price: 1,
        barcode: "893000000001",
      }),
    ).rejects.toThrow();
    await identity(staff);
    await expect(
      command("product_update", {
        variant_id: quantity,
        price: 1,
        min_stock: 1,
        warranty_days: 0,
      }),
    ).rejects.toThrow("chủ cửa hàng");
    await identity(owner);
  });
  it("searches full history with server-side role filtering", async () => {
    const state = await snap(),
      sale = state.documents.find((d: any) => d.kind === "SALE");
    const history = async (query: string, kind = "ALL") =>
      (
        await db.query<{ result: any }>(
          "select public.app_history($1,$2,$3,0)result",
          [store, query, kind],
        )
      ).rows[0].result;
    expect((await history(sale.code)).map((d: any) => d.id)).toContain(sale.id);
    await identity(staff);
    const rows = await history("");
    expect(
      rows.every(
        (d: any) =>
          d.cost === undefined &&
          d.lines.every((l: any) => l.cost === undefined),
      ),
    ).toBe(true);
    expect(await history("", "PURCHASE")).toEqual([]);
    await identity(outsider);
    await expect(history("")).rejects.toThrow("quyền");
    await identity(owner);
  });
  it("aggregates reports from the full journal and hides margins on the server", async () => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const r = (
        await db.query<{ result: any }>(
          "select public.app_report($1,$2::date,$2::date)result",
          [store, today],
        )
      ).rows[0].result,
      s = await snap();
    const expected = s.documents.reduce(
      (a: any, d: any) =>
        a +
        (d.kind === "SALE" ? d.total : d.kind === "SALE_RETURN" ? -d.total : 0),
      0,
    );
    expect(r.revenue).toBe(expected);
    expect(r.groups.reduce((a: number, g: any) => a + g.revenue, 0)).toBe(
      r.revenue,
    );
    expect(r.groups.reduce((a: number, g: any) => a + g.cost, 0)).toBe(r.cost);
    await identity(staff);
    const hidden = (
      await db.query<{ result: any }>(
        "select public.app_report($1,$2::date,$2::date)result",
        [store, today],
      )
    ).rows[0].result;
    expect(hidden.cost).toBeNull();
    expect(hidden.groups.every((g: any) => g.cost === null)).toBe(true);
    await identity(owner);
  });
});
