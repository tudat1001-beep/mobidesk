export const money = (n = 0) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n) + " ₫";
export const compactMoney = (n: number) =>
  Math.abs(n) >= 1e9
    ? `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`
    : Math.abs(n) >= 1e6
      ? `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`
      : money(n);
export const vnDate = (date: string, time = false) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(time ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(new Date(date));
export const dayKey = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
export function integer(value: unknown, name: string, min = 0): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > 1_000_000_000_000)
    throw new Error(`${name} không hợp lệ.`);
  return n;
}
export function allocate(total: number, weights: number[]): number[] {
  integer(total, "Số tiền");
  weights.forEach((w) => integer(w, "Giá trị"));
  const sum = weights.reduce((a, b) => a + BigInt(b), 0n);
  if (!sum) {
    if (total) throw new Error("Không thể phân bổ vào tổng bằng 0.");
    return weights.map(() => 0);
  }
  const raw = weights.map((w, i) => ({
    i,
    q: (BigInt(total) * BigInt(w)) / sum,
    r: (BigInt(total) * BigInt(w)) % sum,
  }));
  const result = raw.map((v) => Number(v.q));
  let remainder = total - result.reduce((a, b) => a + b, 0);
  raw
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1))
    .forEach((v) => {
      if (remainder-- > 0) result[v.i]++;
    });
  return result;
}
export function isImei(value: string): boolean {
  return (
    /^\d{15}$/.test(value) &&
    [...value].reduce((sum, c, i) => {
      let n = Number(c) * (i % 2 ? 2 : 1);
      if (n > 9) n -= 9;
      return sum + n;
    }, 0) %
      10 ===
      0
  );
}
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
export function cartTotal(
  lines: { quantity: number; price: number; discount: number }[],
  discount = 0,
) {
  const values = lines.map((l) => {
    const q = integer(l.quantity, "Số lượng", 1),
      p = integer(l.price, "Đơn giá"),
      d = integer(l.discount, "Giảm giá");
    if (d > q * p) throw new Error("Giảm giá vượt tiền hàng.");
    return q * p - d;
  });
  integer(discount, "Giảm giá hóa đơn");
  const sum = values.reduce((a, b) => a + b, 0);
  if (discount > sum) throw new Error("Giảm giá hóa đơn vượt tiền hàng.");
  return {
    total: sum - discount,
    amounts: values.map((v, i) => v - allocate(discount, values)[i]),
  };
}
