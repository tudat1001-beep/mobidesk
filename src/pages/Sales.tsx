import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  WifiOff,
  ArrowRight,
  Users,
} from "lucide-react";
import type { CartLine, Product, Unit } from "../domain/types";
import { cartTotal, integer, isImei, money, normalize } from "../domain/money";
import { useApp } from "../lib/context";
import { recordOffline, scopeKey } from "../lib/storage";
import { MoneyInput } from "../components/MoneyInput";
import {
  paymentAmounts,
  matchesParty,
  readSalesDraft,
  type PaymentMethod,
} from "../lib/pos";
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
    draftKey = `pos-draft:${scopeKey(a.demo, s.store.id, s.user_id)}:${purchase ? "purchase" : "sale"}`,
    [initial] = useState(() => readSalesDraft(sessionStorage, draftKey)),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("Tất cả"),
    [cart, setCart] = useState<CartLine[]>(initial.cart),
    [pick, setPick] = useState<Product | null>(null),
    [party, setParty] = useState(initial.party),
    [discount, setDiscount] = useState(initial.discount),
    [cash, setCash] = useState(initial.cash),
    [bank, setBank] = useState(initial.bank),
    [freight, setFreight] = useState(initial.freight),
    [note, setNote] = useState(initial.note),
    [saving, setSaving] = useState(false),
    [method, setMethod] = useState<PaymentMethod>(initial.method),
    [mobileStep, setMobileStep] = useState<"catalog" | "checkout">("catalog"),
    [partyPicker, setPartyPicker] = useState(false),
    [partyQuery, setPartyQuery] = useState(""),
    [draftSaved, setDraftSaved] = useState(true),
    [restored, setRestored] = useState(initial.cart.length > 0),
    [entryError, setEntryError] = useState(""),
    [purchaseCost, setPurchaseCost] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (
      ![
        discount,
        freight,
        Number(cash),
        Number(bank),
        ...cart.flatMap((l) => [l.price, l.quantity, l.discount]),
      ].every(Number.isFinite) ||
      cart.some((l) => l.quantity < 1)
    )
      return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          cart,
          party,
          discount,
          cash,
          bank,
          freight,
          note,
          method,
        }),
      );
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
    }
  }, [draftKey, cart, party, discount, cash, bank, freight, note, method]);
  const grant = s.grants.find(
      (g) =>
        g.status === "ACTIVE" &&
        g.terminal_id === a.terminal &&
        g.user_id === s.user_id,
    ),
    useGrant = !purchase && !!grant;
  const totals = useMemo(() => {
      try {
        return { amount: cartTotal(cart, discount).total, error: "" };
      } catch (e) {
        return { amount: 0, error: (e as Error).message };
      }
    }, [cart, discount]),
    amount = totals.amount,
    { cashPaid, bankPaid } = paymentAmounts(
      useGrant ? "CASH" : method,
      amount,
      cash,
      bank,
    ),
    count = cart.reduce((n, l) => n + l.quantity, 0),
    selectedParty = s.parties.find((p) => p.id === party),
    partyOptions = s.parties.filter(
      (p) =>
        (purchase ? p.type !== "CUSTOMER" : p.type !== "SUPPLIER") &&
        matchesParty(p, partyQuery),
    ),
    paymentError =
      totals.error ||
      (![cashPaid, bankPaid, freight].every(
        (v) => Number.isSafeInteger(v) && v >= 0 && v <= 1e12,
      )
        ? "Kiểm tra lại số tiền đã nhập."
        : !useGrant && cashPaid + bankPaid > amount
          ? "Tổng thanh toán vượt tiền hàng. Kiểm tra lại tiền mặt và chuyển khoản."
          : !party && (purchase || cashPaid + bankPaid < amount)
            ? purchase
              ? "Chọn nhà cung cấp trước khi ghi nhận."
              : "Chọn khách hàng để ghi nhận phần còn nợ."
            : "");
  function review(step: "catalog" | "checkout") {
    setMobileStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function chooseMethod(next: PaymentMethod) {
    setMethod(next);
    setCash(next === "BANK" || next === "CREDIT" ? "0" : "");
    setBank(next === "BANK" ? "" : "0");
  }
  function openProduct(p: Product) {
    if (
      !purchase &&
      (!available(p) ||
        (p.mode !== "QUANTITY" &&
          !s.units.some(
            (u) =>
              u.variant_id === p.id &&
              selectable(u) &&
              !cart.some((l) => l.unit_id === u.id),
          )))
    ) {
      a.notify("Đã chọn hết hoặc sản phẩm không còn tồn được phép bán.", true);
      return;
    }
    setEntryError("");
    setPurchaseCost(0);
    if (p.mode === "QUANTITY") add(p);
    else setPick(p);
  }
  function selectable(u: Unit) {
    return (
      u.status === (useGrant ? "OFFLINE_RESERVED" : "AVAILABLE") &&
      (!useGrant ||
        (grant!.lines.some((l) => l.unit_id === u.id) &&
          !a.outbox.some(
            (r) =>
              r.grant_id === grant!.id &&
              r.sequence > grant!.last_sequence &&
              r.lines.some((l) => l.unit_id === u.id),
          )))
    );
  }
  const products = s.products.filter(
    (p) =>
      !p.archived &&
      (category === "Tất cả" || p.category === category) &&
      (normalize(
        `${p.name} ${p.sku} ${p.barcode || ""} ${p.brand} ${p.color}`,
      ).includes(normalize(query)) ||
        s.units.some(
          (u) =>
            u.variant_id === p.id &&
            normalize(`${u.identifier} ${u.imei2}`).includes(normalize(query)),
        )),
  );
  useEffect(() => {
    if (useGrant) {
      chooseMethod("CASH");
      setParty("");
    }
  }, [grant?.id, useGrant]);
  function quantityAt(index: number, quantity: number) {
    const line = cart[index],
      p = s.products.find((p) => p.id === line.variant_id)!;
    if (!Number.isSafeInteger(quantity) || quantity < 0) return;
    if (!purchase && quantity > available(p)) {
      a.notify(`Chỉ còn ${available(p)} sản phẩm có thể bán.`, true);
      return;
    }
    setCart(cart.map((l, i) => (i === index ? { ...l, quantity } : l)));
  }
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
    if (!purchase && u && !selectable(u)) {
      a.notify("IMEI / Serial này không còn trong tồn được phép bán.", true);
      return;
    }
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
      if (!purchase && cart[key].quantity >= available(p)) {
        a.notify(`Đã chọn hết ${available(p)} sản phẩm có thể bán.`, true);
        return;
      }
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
    if (window.matchMedia("(min-width: 1021px)").matches)
      searchRef.current?.focus();
  }
  async function checkout() {
    if (saving || !cart.length) return;
    setSaving(true);
    try {
      if (paymentError) throw new Error(paymentError);
      if (!purchase)
        for (const l of cart) {
          const p = s.products.find((p) => p.id === l.variant_id);
          if (
            !p ||
            l.quantity > available(p) ||
            (l.unit_id &&
              !s.units.some((u) => u.id === l.unit_id && selectable(u)))
          )
            throw new Error(
              "Hàng trong phiếu không còn đủ khả dụng. Kiểm tra lại kho và phiếu.",
            );
        }
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
      setParty("");
      setFreight(0);
      chooseMethod("CASH");
      setRestored(false);
      setMobileStep("catalog");
    } catch (e) {
      a.notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  }
  function scan() {
    const value = query.trim();
    if (!value) {
      searchRef.current?.focus();
      return;
    }
    const unit = s.units.find(
        (u) => u.identifier === value || u.imei2 === value,
      ),
      p = unit
        ? s.products.find((p) => p.id === unit.variant_id)
        : s.products.find(
            (p) =>
              p.sku.toLowerCase() === value.toLowerCase() ||
              p.barcode === value,
          ) || (products.length === 1 ? products[0] : undefined);
    if (p) {
      if (unit) add(p, unit);
      else openProduct(p);
      setQuery("");
      if (window.matchMedia("(max-width:1020px)").matches)
        searchRef.current?.blur();
    } else
      a.notify(
        "Không tìm thấy SKU, IMEI hoặc Serial. Bạn có thể tìm theo tên.",
        true,
      );
  }
  return (
    <div className="pos-page" data-step={mobileStep}>
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
      {!draftSaved && (
        <div className="notice amber">
          Chưa lưu được phiếu nháp trên máy. Giữ tab này mở cho đến khi hoàn
          tất.
        </div>
      )}
      {restored && (
        <div className="pos-draft" role="status">
          <span>Đã khôi phục phiếu nháp · {count} sản phẩm</span>
          <button onClick={() => setRestored(false)}>Ẩn</button>
        </div>
      )}
      <nav className="pos-mobile-tabs" aria-label="Các bước lập phiếu">
        <button
          aria-current={mobileStep === "catalog" ? "step" : undefined}
          onClick={() => review("catalog")}
        >
          1. Chọn hàng
        </button>
        <button
          aria-current={mobileStep === "checkout" ? "step" : undefined}
          onClick={() => review("checkout")}
        >
          2. Phiếu & thanh toán <b>{count}</b>
        </button>
      </nav>
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
                ref={searchRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label={
                  purchase ? "Tìm sản phẩm để nhập" : "Tìm sản phẩm để bán"
                }
                placeholder="Tìm tên, SKU, IMEI / Serial…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) scan();
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
                className={`product-card ${cart.some((l) => l.variant_id === p.id) ? "selected" : ""}`}
                key={p.id}
                onClick={() => openProduct(p)}
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
                    {cart.some((l) => l.variant_id === p.id)
                      ? `Đã chọn ${cart.filter((l) => l.variant_id === p.id).reduce((n, l) => n + l.quantity, 0)} · `
                      : ""}
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
            <button
              className="party-select"
              disabled={useGrant}
              onClick={() => {
                setPartyQuery("");
                setPartyPicker(true);
              }}
              aria-label={purchase ? "Chọn nhà cung cấp" : "Chọn khách hàng"}
            >
              <Users size={18} />
              <span>
                <strong>
                  {selectedParty?.name ||
                    (purchase ? "Chọn nhà cung cấp" : "Khách lẻ")}
                </strong>
                <small>
                  {selectedParty?.phone ||
                    (purchase
                      ? "Tìm theo tên hoặc số điện thoại"
                      : "Chạm để tìm khách / ghi nợ")}
                </small>
              </span>
              <Search size={16} />
            </button>
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
                          aria-label={`Giảm số lượng ${p.name}`}
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
                        <input
                          type="number"
                          inputMode="numeric"
                          aria-label={`Số lượng ${p.name}`}
                          min="1"
                          value={l.quantity || ""}
                          disabled={p.mode !== "QUANTITY"}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            quantityAt(i, Number(e.target.value))
                          }
                          onBlur={() => {
                            if (!l.quantity) quantityAt(i, 1);
                          }}
                        />
                        <button
                          aria-label={`Tăng số lượng ${p.name}`}
                          disabled={
                            p.mode !== "QUANTITY" ||
                            (!purchase && l.quantity >= available(p))
                          }
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
                      <label className="line-price">
                        <span>Đơn giá</span>
                        <MoneyInput
                          className="price-input"
                          aria-label={`Đơn giá ${p.name}`}
                          required
                          value={l.price}
                          disabled={useGrant}
                          onChange={(value) =>
                            setCart(
                              cart.map((x, n) =>
                                n === i ? { ...x, price: value } : x,
                              ),
                            )
                          }
                        />
                      </label>
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
                {totals.error
                  ? "—"
                  : money(
                      cart.reduce(
                        (a, l) => a + l.quantity * l.price - l.discount,
                        0,
                      ),
                    )}
              </b>
            </div>
            <div className="summary-row">
              <label htmlFor="invoice-discount">Giảm giá hóa đơn</label>
              <MoneyInput
                id="invoice-discount"
                value={discount}
                disabled={useGrant}
                onChange={setDiscount}
              />
            </div>
            {purchase && (
              <div className="summary-row">
                <label htmlFor="freight">Chi phí nhập trả riêng</label>
                <MoneyInput
                  id="freight"
                  value={freight}
                  onChange={setFreight}
                />
              </div>
            )}
            <div className="summary-row total">
              <span>Tổng thanh toán</span>
              <b>{money(amount)}</b>
            </div>
            {!useGrant && (
              <div
                className="payment-methods"
                role="group"
                aria-label="Phương thức thanh toán"
              >
                {(
                  [
                    ["CASH", "Tiền mặt"],
                    ["BANK", "Chuyển khoản"],
                    ["SPLIT", "Kết hợp"],
                    ["CREDIT", "Ghi nợ"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={method === key}
                    onClick={() => {
                      if (method !== key) chooseMethod(key);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div
              className={
                method === "SPLIT" && !useGrant
                  ? "two-cols payment-inputs"
                  : "payment-inputs"
              }
            >
              {(useGrant || method !== "BANK") && (
                <Field
                  label={
                    useGrant
                      ? "Tiền khách đưa"
                      : method === "CREDIT"
                        ? "Tiền mặt trả trước"
                        : "Tiền mặt thanh toán"
                  }
                >
                  <MoneyInput
                    aria-label={
                      useGrant
                        ? "Tiền khách đưa"
                        : method === "CREDIT"
                          ? "Tiền mặt trả trước"
                          : "Tiền mặt thanh toán"
                    }
                    value={cashPaid}
                    onChange={(value) => setCash(String(value))}
                  />
                  {method !== "CREDIT" && (
                    <button
                      className="amount-shortcut"
                      disabled={!Number.isFinite(bankPaid)}
                      onClick={() => setCash("")}
                    >
                      Điền đủ{" "}
                      {Number.isFinite(bankPaid)
                        ? money(Math.max(0, amount - bankPaid))
                        : "tiền mặt"}
                    </button>
                  )}
                </Field>
              )}
              {!useGrant && ["BANK", "SPLIT"].includes(method) && (
                <Field label="Chuyển khoản đã kiểm tra">
                  <MoneyInput
                    aria-label="Chuyển khoản đã kiểm tra"
                    value={bankPaid}
                    onChange={(value) => setBank(String(value))}
                  />
                  <button
                    className="amount-shortcut"
                    onClick={() => {
                      setBank("");
                      if (method === "SPLIT")
                        setBank(
                          String(
                            Math.max(0, amount - (cash === "" ? 0 : cashPaid)),
                          ),
                        );
                    }}
                  >
                    Điền số tiền còn lại
                  </button>
                </Field>
              )}
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
                {!Number.isFinite(cashPaid + bankPaid)
                  ? "—"
                  : money(
                      useGrant && cashPaid > amount
                        ? cashPaid - amount
                        : Math.max(0, amount - cashPaid - bankPaid),
                    )}
              </b>
            </div>
            <input
              className="cart-note"
              aria-label="Ghi chú giao dịch"
              placeholder="Ghi chú giao dịch (nếu có)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {cart.length > 0 && paymentError && (
              <div className="pos-error" role="status">
                {paymentError}
                {!party && (purchase || cashPaid + bankPaid < amount) && (
                  <button
                    onClick={() => {
                      setPartyQuery("");
                      setPartyPicker(true);
                    }}
                  >
                    Chọn {purchase ? "nhà cung cấp" : "khách hàng"}
                  </button>
                )}
              </div>
            )}
            <Button
              variant="cart-submit"
              onClick={() => void checkout()}
              disabled={!cart.length || saving || a.busy || !!paymentError}
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
              {draftSaved &&
                " Nháp được giữ trong tab này khi chuyển màn / tải lại."}
            </small>
          </div>
        </aside>
      </div>
      <div className="pos-mobile-bar">
        <div>
          <small>
            {mobileStep === "catalog"
              ? `${count} sản phẩm đã chọn`
              : useGrant
                ? "Tiền mặt tại quầy"
                : {
                    CASH: "Tiền mặt",
                    BANK: "Chuyển khoản",
                    SPLIT: "Tiền mặt + chuyển khoản",
                    CREDIT: "Thanh toán / ghi nợ",
                  }[method]}
          </small>
          <strong aria-live="polite">
            {totals.error ? "Kiểm tra phiếu" : money(amount)}
          </strong>
        </div>
        <button
          className="btn"
          disabled={
            !cart.length ||
            saving ||
            a.busy ||
            (mobileStep === "checkout" && !!paymentError)
          }
          onClick={() =>
            mobileStep === "catalog" ? review("checkout") : void checkout()
          }
        >
          {mobileStep === "catalog" ? (
            <>
              Xem phiếu <ArrowRight size={18} />
            </>
          ) : saving ? (
            "Đang lưu…"
          ) : useGrant ? (
            "Lưu tại quầy"
          ) : purchase ? (
            "Ghi nhận nhập"
          ) : (
            "Xác nhận bán"
          )}
        </button>
      </div>
      {partyPicker && (
        <Modal
          title={purchase ? "Chọn nhà cung cấp" : "Chọn khách hàng"}
          subtitle="Tìm theo tên hoặc số điện thoại"
          onClose={() => setPartyPicker(false)}
        >
          <div className="party-search search-box">
            <Search size={18} />
            <input
              type="search"
              autoFocus
              aria-label="Tìm đối tác trong phiếu"
              value={partyQuery}
              onChange={(e) => setPartyQuery(e.target.value)}
              placeholder="Nhập tên hoặc số điện thoại…"
              enterKeyHint="search"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.nativeEvent.isComposing &&
                  partyOptions.length === 1
                ) {
                  setParty(partyOptions[0].id);
                  setPartyPicker(false);
                }
              }}
            />
          </div>
          <div className="party-results">
            {!purchase && (
              <button
                onClick={() => {
                  setParty("");
                  setPartyPicker(false);
                }}
              >
                <span>
                  <strong>Khách lẻ</strong>
                  <small>Không ghi công nợ</small>
                </span>
                {!party && <Check size={18} />}
              </button>
            )}
            {partyOptions.slice(0, 50).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setParty(p.id);
                  setPartyPicker(false);
                }}
              >
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.phone || "Chưa có số điện thoại"}</small>
                </span>
                {p.id === party ? (
                  <Check size={18} />
                ) : (
                  <ArrowRight size={16} />
                )}
              </button>
            ))}
            {!partyOptions.length && (
              <Empty
                title="Chưa tìm thấy đối tác"
                detail="Thử tên hoặc số điện thoại khác."
              />
            )}
          </div>
          {partyOptions.length > 50 && (
            <p className="pos-helper">
              Nhập thêm để thu hẹp {partyOptions.length} kết quả.
            </p>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setPartyPicker(false);
              a.modal("party", purchase ? "SUPPLIER" : "CUSTOMER");
            }}
          >
            Thêm {purchase ? "nhà cung cấp" : "khách hàng"}
          </Button>
        </Modal>
      )}
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
                const identifier = String(f.get("identifier") || "").trim(),
                  imei2 = String(f.get("imei2") || "").trim();
                if (
                  pick.mode === "IMEI" &&
                  (!isImei(identifier) || (imei2 && !isImei(imei2)))
                ) {
                  setEntryError(
                    "IMEI cần đúng 15 chữ số và mã kiểm tra. Kiểm tra lại tem máy.",
                  );
                  return;
                }
                if (imei2 === identifier && imei2) {
                  setEntryError("IMEI 1 và IMEI 2 không được trùng nhau.");
                  return;
                }
                try {
                  integer(purchaseCost, "Giá nhập");
                } catch (e) {
                  setEntryError((e as Error).message);
                  return;
                }
                add(pick, undefined, {
                  identifier,
                  imei2,
                  price: purchaseCost,
                  condition: String(f.get("condition")),
                });
              }}
            >
              <Field label={pick.mode === "IMEI" ? "IMEI 1" : "Serial"}>
                <input
                  name="identifier"
                  required
                  autoFocus
                  inputMode={pick.mode === "IMEI" ? "numeric" : "text"}
                  maxLength={pick.mode === "IMEI" ? 15 : 100}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              {pick.mode === "IMEI" && (
                <Field label="IMEI 2 (nếu có)">
                  <input
                    name="imei2"
                    inputMode="numeric"
                    maxLength={15}
                    autoComplete="off"
                  />
                </Field>
              )}
              <div className="two-cols">
                <Field label="Giá nhập">
                  <MoneyInput
                    name="cost"
                    value={purchaseCost}
                    onChange={setPurchaseCost}
                    required
                  />
                </Field>
                <Field label="Tình trạng">
                  <select name="condition">
                    <option>Mới</option>
                    <option>Cũ · Đã kiểm tra</option>
                  </select>
                </Field>
              </div>
              {entryError && (
                <div className="pos-error" role="alert">
                  {entryError}
                </div>
              )}
              <Button type="submit" disabled={!Number.isFinite(purchaseCost)}>
                Thêm vào phiếu
              </Button>
            </form>
          ) : (
            <div className="unit-picker">
              {s.units
                .filter(
                  (u) =>
                    u.variant_id === pick.id &&
                    selectable(u) &&
                    !cart.some((l) => l.unit_id === u.id),
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
    </div>
  );
}
function XIcon() {
  return <span>×</span>;
}
function SmartphoneIcon() {
  return <span className="transaction-icon green">▯</span>;
}
