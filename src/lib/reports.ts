import { useEffect, useState } from "react";
import type { Snapshot } from "../domain/types";
import { dayKey } from "../domain/money";
import { supabase } from "./gateway";
export interface Report {
  revenue: number;
  cost: number | null;
  sale_count: number;
  return_count: number;
  cash: number;
  bank: number;
  inflow: number;
  outflow: number;
  inventory_value: number | null;
  receivables: number;
  payables: number | null;
  daily: {
    day: string;
    revenue: number;
    cost: number | null;
    sale_count: number;
  }[];
  groups: {
    mode: string;
    quantity: number;
    revenue: number;
    cost: number | null;
  }[];
}
function demoReport(s: Snapshot, from: string, to: string): Report {
  const docs = s.documents.filter(
      (d) => dayKey(d.posted_at) >= from && dayKey(d.posted_at) <= to,
    ),
    sale = docs.filter((d) => d.kind === "SALE"),
    returns = docs.filter((d) => d.kind === "SALE_RETURN"),
    net = (field: "total" | "cost") =>
      sale.reduce((a, d) => a + (d[field] || 0), 0) -
      returns.reduce((a, d) => a + (d[field] || 0), 0);
  const payments = docs.flatMap((d) => d.payments),
    daily: Report["daily"] = [];
  for (
    let d = new Date(from + "T00:00:00+07:00");
    dayKey(d.toISOString()) <= to;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const key = dayKey(d.toISOString()),
      ss = sale.filter((x) => dayKey(x.posted_at) === key),
      rr = returns.filter((x) => dayKey(x.posted_at) === key);
    daily.push({
      day: key,
      revenue:
        ss.reduce((a, x) => a + x.total, 0) -
        rr.reduce((a, x) => a + x.total, 0),
      cost:
        ss.reduce((a, x) => a + (x.cost || 0), 0) -
        rr.reduce((a, x) => a + (x.cost || 0), 0) +
        docs
          .filter((x) => x.kind === "COST" && dayKey(x.posted_at) === key)
          .reduce((a, x) => a + (x.cost || 0), 0),
      sale_count: ss.length,
    });
  }
  return {
    revenue: net("total"),
    cost:
      net("cost") +
      docs
        .filter((d) => d.kind === "COST")
        .reduce((a, d) => a + (d.cost || 0), 0),
    sale_count: sale.length,
    return_count: returns.length,
    cash: payments
      .filter((p) => p.direction === "IN" && p.method === "CASH")
      .reduce((a, p) => a + p.amount, 0),
    bank: payments
      .filter((p) => p.direction === "IN" && p.method === "BANK")
      .reduce((a, p) => a + p.amount, 0),
    inflow: payments
      .filter((p) => p.direction === "IN")
      .reduce((a, p) => a + p.amount, 0),
    outflow: payments
      .filter((p) => p.direction === "OUT")
      .reduce((a, p) => a + p.amount, 0),
    inventory_value:
      s.balances.reduce((a, b) => a + (b.value || 0), 0) +
      s.units
        .filter((u) =>
          ["AVAILABLE", "QUARANTINE", "REPAIR", "OFFLINE_RESERVED"].includes(
            u.status,
          ),
        )
        .reduce((a, u) => a + (u.cost || 0), 0),
    receivables: s.parties.reduce((a, p) => a + Math.max(0, p.ar), 0),
    payables: s.parties.reduce((a, p) => a + Math.max(0, p.ap), 0),
    daily,
    groups: ["IMEI", "QUANTITY", "SERIAL"].map((mode) => {
      const ss = sale
          .flatMap((d) => d.lines)
          .filter(
            (l) => s.products.find((p) => p.id === l.variant_id)?.mode === mode,
          ),
        rr = returns
          .flatMap((d) => d.lines)
          .filter(
            (l) => s.products.find((p) => p.id === l.variant_id)?.mode === mode,
          );
      return {
        mode,
        quantity:
          ss.reduce((a, l) => a + l.quantity, 0) -
          rr.reduce((a, l) => a + l.quantity, 0),
        revenue:
          ss.reduce((a, l) => a + l.total, 0) -
          rr.reduce((a, l) => a + l.total, 0),
        cost:
          ss.reduce((a, l) => a + (l.cost || 0), 0) -
          rr.reduce((a, l) => a + (l.cost || 0), 0) +
          docs
            .filter(
              (d) =>
                d.kind === "COST" &&
                s.movements.some(
                  (m) =>
                    m.document_id === d.id &&
                    s.products.find((p) => p.id === m.variant_id)?.mode ===
                      mode,
                ),
            )
            .reduce((a, d) => a + (d.cost || 0), 0),
      };
    }),
  };
}
export function useReport(
  s: Snapshot,
  demo: boolean,
  from: string,
  to: string,
) {
  const [result, setResult] = useState<Report | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setResult(null);
    setError("");
    if (
      !from ||
      !to ||
      from > to ||
      (Date.parse(to) - Date.parse(from)) / 86400000 > 366
    ) {
      setError("Chọn khoảng ngày hợp lệ, tối đa 367 ngày.");
      return;
    }
    if (demo) {
      setResult(demoReport(s, from, to));
      return;
    }
    void supabase!
      .rpc("app_report", { p_store: s.store.id, p_from: from, p_to: to })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setError(error.message);
        else setResult(data as Report);
      });
    return () => {
      live = false;
    };
  }, [s, demo, from, to]);
  return { report: result, error };
}
