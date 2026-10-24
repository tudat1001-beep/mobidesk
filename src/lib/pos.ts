import type { CartLine } from "../domain/types";
import { normalize } from "../domain/money";
export function matchesParty(
  party: { name: string; phone: string },
  query: string,
) {
  const digits = query.replace(/\D/g, "");
  return (
    normalize(party.name).includes(normalize(query)) ||
    (digits.length > 0 && party.phone.replace(/\D/g, "").includes(digits))
  );
}
export type PaymentMethod = "CASH" | "BANK" | "SPLIT" | "CREDIT";
export interface SalesDraft {
  cart: CartLine[];
  party: string;
  discount: number;
  cash: string;
  bank: string;
  freight: number;
  note: string;
  method: PaymentMethod;
}
export const emptyDraft = (): SalesDraft => ({
  cart: [],
  party: "",
  discount: 0,
  cash: "",
  bank: "0",
  freight: 0,
  note: "",
  method: "CASH",
});
export function parseVnd(text: string, required = false): number {
  const s = text.trim();
  if (s === "") return required ? NaN : 0;
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(s)) return NaN;
  const value = Number(s.replaceAll(".", ""));
  return Number.isSafeInteger(value) && value <= 1_000_000_000_000
    ? value
    : NaN;
}
export function paymentAmounts(
  method: PaymentMethod,
  total: number,
  cash: string,
  bank: string,
) {
  const bankPaid = method === "BANK" && bank === "" ? total : Number(bank);
  const cashPaid =
    cash === ""
      ? Number.isFinite(bankPaid)
        ? Math.max(0, total - bankPaid)
        : 0
      : Number(cash);
  return { cashPaid, bankPaid };
}
export function readSalesDraft(
  storage: Pick<Storage, "getItem">,
  key: string,
): SalesDraft {
  try {
    const d = JSON.parse(storage.getItem(key) || "null") as SalesDraft | null;
    if (
      !d ||
      !Array.isArray(d.cart) ||
      !["CASH", "BANK", "SPLIT", "CREDIT"].includes(d.method) ||
      typeof d.party !== "string" ||
      typeof d.note !== "string" ||
      typeof d.cash !== "string" ||
      typeof d.bank !== "string"
    )
      return emptyDraft();
    if (
      ![d.discount, d.freight, Number(d.cash), Number(d.bank)].every(
        (v) => Number.isSafeInteger(v) && v >= 0 && v <= 1e12,
      )
    )
      return emptyDraft();
    if (
      !d.cart.every(
        (l) =>
          typeof l.variant_id === "string" &&
          [l.quantity, l.price, l.discount].every(
            (v) => Number.isSafeInteger(v) && v >= 0 && v <= 1e12,
          ) &&
          l.quantity > 0,
      )
    )
      return emptyDraft();
    return d;
  } catch {
    return emptyDraft();
  }
}
