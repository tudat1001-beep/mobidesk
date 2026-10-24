import { useMemo, useState } from "react";
import {
  Check,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Trash2,
  WifiOff,
} from "lucide-react";
import type { CartLine, Product, Unit } from "../domain/types";
import { cartTotal, money, normalize } from "../domain/money";
import { useApp } from "../lib/context";
import { getLocal, recordOffline, scopeKey } from "../lib/storage";
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  PageHeading,
  ProductArt,
  modes,
} from "../components/ui";

export default function Sales({ purchase = false }: { purchase?: boolean }) {
  const a = useApp(),
    { data: s, online } = a,
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("Tất cả"),
    [cart, setCart] = useState<CartLine[]>([]),
    [pick, setPick] = useState<Product | null>(null),
    [party, setParty] = useState(""),
    [discount, setDiscount] = useState(0),
    [cash, setCash] = useState(""),
    [bank, setBank] = useState("0"),
    [freight, setFreight] = useState(0),
    [note, setNote] = useState(""),
    [saving, setSaving] = useState(false),
    [cashOnly, setCashOnly] = useState(false);
  const grant = s.grants.find(
      (g) =>
        g.status === "ACTIVE" &&
        g.terminal_id === a.terminal &&
        g.user_id === s.user_id,
    ),
    useGrant = !purchase && !!grant,
    offline = !online || cashOnly;
  const amount = useMemo(() => {
      try {
        return cartTotal(cart, discount).total;
      } catch {
        return 0;
      }
    }, [cart, discount]),
    cashPaid = cash === "" ? amount : Number(cash),
    bankPaid = Number(bank) || 0;
  const products = s.products.filter(
    (p) =>
      !p.archived &&
      (category === "Tất cả" || p.category === category) &&
      normalize(
        `${p.name} ${p.sku} ${p.barcode || ""} ${p.brand} ${p.color}`,
      ).includes(normalize(query)),
  );
  function available(p: Product) {
    if (useGrant) {
      const ls = grant!.lines.filter((l) => l.variant_id === p.id),
        already = a.outbox
          .filter(
            (r) =>
              r.grant_id === grant!.id && r.sequence > grant!.last_sequence,
          )
          .flatMap((r) => r.lines)
          .filter((l) => l.variant_id === p.id)
          .reduce((n, l) => n + l.quantity, 0);
      return Math.max(
        0,
        ls.reduce((n, l) => n + l.quantity - l.consumed, 0) - already,
      );
    }
    return p.mode === "QUANTITY"
      ? s.balances.find((b) => b.variant_id === p.id)?.available || 0
      : s.units.filter((u) => u.variant_id === p.id && u.status === "AVAILABLE")
          .length;
  }
  function add(p: Product, u?: Unit, details?: Partial<CartLine>) {
    if (!purchase && !available(p)) {
      a.notify("Sản phẩm chưa có tồn bán được.", true);
      return;
    }
    const key = cart.findIndex(
      (l) =>
        l.variant_id === p.id && (p.mode === "QUANTITY" || l.unit_id === u?.id),
    );
    if (!purchase && key >= 0 && p.mode !== "QUANTITY") {
      a.notify("Thiết bị này đã có trong giỏ.");
      return;
    }
    if (p.mode === "QUANTITY" && key >= 0) {
      setCart(
        cart.map((l, i) =>
          i === key ? { ...l, quantity: l.quantity + 1 } : l,
        ),
      );
    } else
      setCart([
        ...cart,
        {
          variant_id: p.id,
          unit_id: u?.id,
          quantity: 1,
          price: purchase
            ? 0
            : ((useGrant
                ? grant!.lines.find(
                    (l) => l.variant_id === p.id && (!u || l.unit_id === u.id),
                  )?.price
                : undefined) ?? p.price),
          discount: 0,
          identifier: u?.identifier,
          ...details,
        },
      ]);
    setPick(null);
    setCash("");
  }
  async function checkout() {
    if (saving || !cart.length) return;
    setSaving(true);
    try {
      if (!purchase && useGrant) {
        if (discount || bankPaid || party)
          throw new Error(
            "Quầy đã cấp hàng chỉ bán tiền mặt đủ, không giảm ngoài giá đã cấp hoặc ghi nợ.",
          );
        const key = scopeKey(a.demo, s.store.id, s.user_id);
        const r = await recordOffline(
          key,
          { store: s.store.id, user: s.user_id, terminal: a.terminal },
          cart,
          cashPaid,
        );
        a.notify("Đã lưu tại quầy. Phiếu đang chờ đồng bộ.");
        await a.refreshOutbox();
        a.modal("offline_receipt", r);
      } else {
        if (!online) throw new Error("Máy này chưa có quyền bán offline.");
        if (cashOnly)
          throw new Error(
            "Hãy cấp quyền và hàng cho quầy trong mục Quầy offline trước.",
          );
        const payments = [
          { method: "CASH", amount: cashPaid },
          { method: "BANK", amount: bankPaid },
        ].filter((x) => x.amount > 0);
        const r = await a.run(purchase ? "purchase" : "sale", {
          lines: cart,
          party_id: party || undefined,
          discount,
          payments,
          freight,
          note,
        });
        a.notify(
          `${purchase ? "Phiếu nhập" : "Đơn bán"} ${r.code} đã ghi nhận.`,
        );
        a.modal("document_id", r.id);
      }
      setCart([]);
      setCash("");
      setBank("0");
      setDiscount(0);
      setNote("");
    } catch (e) {
      a.notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  }
  function scan() {
    const value = query.trim();
    const unit = s.units.find(
        (u) => u.identifier === value || u.imei2 === value,
      ),
      p = unit
        ? s.products.find((p) => p.id === unit.variant_id)
        : s.products.find(
            (p) =>
              p.sku.toLowerCase() === value.toLowerCase() ||
              p.barcode === value,
          );
    if (p) {
      if (unit) add(p, unit);
      else p.mode === "QUANTITY" ? add(p) : setPick(p);
      setQuery("");
    } else
      a.notify(
        "Không tìm thấy SKU, IMEI hoặc Serial. Bạn có thể tìm theo tên.",
        true,
      );
  }
  return (
    <>
      <PageHeading
        title={purchase ? "Nhập hàng" : "Bán hàng"}
        description={
          purchase
            ? "Nhập điện thoại và phụ kiện trong cùng một phiếu."
            : "Chọn đúng sản phẩm, bán nhanh và kiểm soát từng giao dịch."
        }
      >
        <Button variant="secondary" onClick={() => a.navigate("history")}>
          Lịch sử giao dịch
        </Button>
        {purchase && (
          <Button onClick={() => a.modal("product")}>
            <Plus size={16} />
            Thêm sản phẩm
          </Button>
        )}
      </PageHeading>
      {useGrant && (
        <div className="notice green">
          <span>
            <Check size={16} />
            Máy quầy đã được cấp hàng riêng. Phiếu lưu tại máy trước, sau đó
            đồng bộ lên hệ thống.
          </span>
          <button onClick={() => a.navigate("offline")}>Quản lý đồng bộ</button>
        </div>
      )}
      {!purchase && !online && !grant && (
        <div className="notice amber">
          <WifiOff size={16} />
          Máy này chưa có quyền bán offline. Có thể soạn giỏ, chưa được ghi nhận
          giao dịch.
        </div>
      )}
      <div className="pos-layout">
        <section className="pos-catalog">
          <div className="catalog-tools">
            <div className="search-box">
              <Search size={18} />
              <input
                aria-label="Tìm sản phẩm để bán"
                placeholder="Tìm tên, SKU, IMEI / Serial…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") scan();
                }}
              />
              <kbd>↵</kbd>
            </div>
            <Button variant="secondary" onClick={scan}>
              Tìm mã
            </Button>
          </div>
          <div className="tabs">
            {["Tất cả", "Điện thoại", "Phụ kiện"].map((c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {products.map((p) => (
              <button
                className="product-card"
                key={p.id}
                onClick={() => (p.mode === "QUANTITY" ? add(p) : setPick(p))}
              >
                <div className="product-picture">
                  <ProductArt product={p} />
                  <Badge tone={p.mode === "IMEI" ? "blue" : "neutral"}>
                    {p.mode === "IMEI"
                      ? "IMEI"
                      : p.mode === "SERIAL"
                        ? "Serial"
                        : "Số lượng"}
                  </Badge>
                </div>
                <strong>{p.name}</strong>
                <span>{[p.capacity, p.color].filter(Boolean).join(" · ")}</span>
                <div className="product-bottom">
                  <b>
                    {money(
                      useGrant
                        ? (grant!.lines.find((l) => l.variant_id === p.id)
                            ?.price ?? p.price)
                        : p.price,
                    )}
                  </b>
                  <small className={available(p) ? "" : "danger-text"}>
                    Còn {available(p)}
                  </small>
                </div>
              </button>
            ))}
          </div>
          {!products.length && (
            <Empty
              title="Không tìm thấy sản phẩm"
              detail="Thử tên khác hoặc thêm một sản phẩm mới."
              action={
                <Button onClick={() => a.modal("product")}>
                  Thêm sản phẩm
                </Button>
              }
            />
          )}
        </section>
        <aside className="cart panel">
          <div className="panel-head">
            <h3>
              {purchase ? "Phiếu nhập hàng" : "Giỏ hàng"}{" "}
              <Badge tone="neutral">
                {cart.reduce((a, l) => a + l.quantity, 0)}
              </Badge>
            </h3>
            {cart.length > 0 && (
              <button
                className="icon-btn"
                title="Xóa giỏ hàng"
                onClick={() => {
                  if (confirm("Xóa các dòng trong giỏ nháp?")) setCart([]);
                }}
              >
                <Trash2 size={17} />
              </button>
            )}
          </div>
          <div className="cart-party">
            <select
              aria-label={purchase ? "Nhà cung cấp" : "Khách hàng"}
              value={party}
              onChange={(e) => setParty(e.target.value)}
              disabled={useGrant}
            >
              <option value="">
                {purchase ? "Chọn nhà cung cấp" : "Khách lẻ · thanh toán đủ"}
              </option>
              {s.parties
                .filter((p) =>
                  purchase ? p.type !== "CUSTOMER" : p.type !== "SUPPLIER",
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone && `· ${p.phone}`}
                  </option>
                ))}
            </select>
            <button
              className="icon-btn"
              title="Thêm đối tác"
              onClick={() =>
                a.modal("party", purchase ? "SUPPLIER" : "CUSTOMER")
              }
            >
              <Plus size={17} />
            </button>
          </div>
          <div className="cart-items">
            {cart.length ? (
              cart.map((l, i) => {
                const p = s.products.find((p) => p.id === l.variant_id)!;
                return (
                  <div
                    className="cart-item"
                    key={`${l.variant_id}-${l.unit_id || i}`}
                  >
                    <div className="cart-item-top">
                      <ProductArt product={p} small />
                      <div>
                        <strong>{p.name}</strong>
                        <small>{l.identifier || p.sku}</small>
                      </div>
                      <button
                        className="icon-btn"
                        aria-label={`Xóa ${p.name}`}
                        onClick={() => setCart(cart.filter((_, n) => n !== i))}
                      >
                        <XIcon />
                      </button>
                    </div>
                    <div className="cart-item-controls">
                      <div className="stepper">
                        <button
                          disabled={l.quantity <= 1 || p.mode !== "QUANTITY"}
                          onClick={() =>
                            setCart(
                              cart.map((x, n) =>
                                n === i
                                  ? { ...x, quantity: x.quantity - 1 }
                                  : x,
                              ),
                            )
                          }
                        >
                          <Minus size={13} />
                        </button>
                        <span>{l.quantity}</span>
                        <button
                          disabled={p.mode !== "QUANTITY"}
                          onClick={() =>
                            setCart(
                              cart.map((x, n) =>
                                n === i
                                  ? { ...x, quantity: x.quantity + 1 }
                                  : x,
                              ),
                            )
                          }
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <input
                        className="price-input"
                        aria-label={`Đơn giá ${p.name}`}
                        type="number"
                        min="0"
                        step="1000"
                        value={l.price}
                        disabled={useGrant}
                        onChange={(e) =>
                          setCart(
                            cart.map((x, n) =>
                              n === i
                                ? { ...x, price: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty
                title="Giỏ hàng đang trống"
                detail="Chọn sản phẩm bên trái để bắt đầu."
              />
            )}
          </div>
          <div className="cart-footer">
            <div className="summary-row">
              <span>Tiền hàng</span>
              <b>
                {money(
                  cart.reduce(
                    (a, l) => a + l.quantity * l.price - l.discount,
                    0,
                  ),
                )}
              </b>
            </div>
            <div className="summary-row">
              <label htmlFor="invoice-discount">Giảm giá hóa đơn</label>
              <input
                id="invoice-discount"
                type="number"
                min="0"
                value={discount}
                disabled={useGrant}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            {purchase && (
              <div className="summary-row">
                <label htmlFor="freight">Chi phí nhập trả riêng</label>
                <input
                  id="freight"
                  type="number"
                  min="0"
                  value={freight}
                  onChange={(e) => setFreight(Number(e.target.value))}
                />
              </div>
            )}
            <div className="summary-row total">
              <span>Tổng thanh toán</span>
              <b>{money(amount)}</b>
            </div>
            <div className="two-cols">
              <Field label="Tiền mặt thực thu / chi">
                <input
                  type="number"
                  min="0"
                  value={cash === "" ? amount : cash}
                  onChange={(e) => setCash(e.target.value)}
                />
              </Field>
              <Field label="Chuyển khoản đã kiểm tra">
                <input
                  type="number"
                  min="0"
                  value={bank}
                  disabled={useGrant}
                  onChange={(e) => setBank(e.target.value)}
                />
              </Field>
            </div>
            <div className="summary-row">
              <span>
                {useGrant && cashPaid > amount
                  ? "Tiền thừa trả khách"
                  : "Còn nợ"}
              </span>
              <b
                className={amount - cashPaid - bankPaid > 0 ? "amber-text" : ""}
              >
                {money(
                  useGrant && cashPaid > amount
                    ? cashPaid - amount
                    : Math.max(0, amount - cashPaid - bankPaid),
                )}
              </b>
            </div>
            <input
              className="cart-note"
              placeholder="Ghi chú giao dịch (nếu có)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              onClick={() => void checkout()}
              disabled={!cart.length || saving || a.busy}
            >
              <ShoppingBag size={18} />
              {saving
                ? "Đang ghi nhận…"
                : useGrant
                  ? "Lưu tại quầy và in"
                  : purchase
                    ? "Ghi nhận nhập hàng"
                    : "Xác nhận bán hàng"}
            </Button>
            <small className="cart-hint">
              {useGrant
                ? "Phiếu sẽ được đánh dấu chưa đồng bộ."
                : purchase
                  ? "Ghi nhận kho, giá vốn và công nợ cùng lúc."
                  : "Chỉ ghi sổ sau khi hệ thống xác nhận thành công."}
            </small>
          </div>
        </aside>
      </div>
      {pick && (
        <Modal
          title={purchase ? "Nhập thông tin thiết bị" : "Chọn thiết bị cụ thể"}
          subtitle={`${pick.name} · ${modes[pick.mode]}`}
          onClose={() => setPick(null)}
        >
          {purchase ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                add(pick, undefined, {
                  identifier: String(f.get("identifier")),
                  imei2: String(f.get("imei2") || ""),
                  price: Number(f.get("cost")),
                  condition: String(f.get("condition")),
                });
              }}
            >
              <Field label={pick.mode === "IMEI" ? "IMEI 1" : "Serial"}>
                <input name="identifier" required autoFocus />
              </Field>
              {pick.mode === "IMEI" && (
                <Field label="IMEI 2 (nếu có)">
                  <input name="imei2" />
                </Field>
              )}
              <div className="two-cols">
                <Field label="Giá nhập">
                  <input type="number" name="cost" min="0" required />
                </Field>
                <Field label="Tình trạng">
                  <select name="condition">
                    <option>Mới</option>
                    <option>Cũ · Đã kiểm tra</option>
                  </select>
                </Field>
              </div>
              <Button type="submit">Thêm vào phiếu</Button>
            </form>
          ) : (
            <div className="unit-picker">
              {s.units
                .filter(
                  (u) =>
                    u.variant_id === pick.id &&
                    u.status ===
                      (useGrant ? "OFFLINE_RESERVED" : "AVAILABLE") &&
                    (!useGrant ||
                      grant!.lines.some(
                        (l) => l.unit_id === u.id && l.quantity > l.consumed,
                      )),
                )
                .map((u) => (
                  <button key={u.id} onClick={() => add(pick, u)}>
                    <SmartphoneIcon />
                    <div>
                      <strong>{u.identifier}</strong>
                      <small>
                        {u.condition}
                        {u.imei2 && ` · IMEI 2: ${u.imei2}`}
                      </small>
                    </div>
                    <Plus size={18} />
                  </button>
                ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
function XIcon() {
  return <span>×</span>;
}
function SmartphoneIcon() {
  return <span className="transaction-icon green">▯</span>;
}
