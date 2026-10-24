import { useState } from "react";
import { ArrowRight, Check, Plus, Printer } from "lucide-react";
import type {
  Document,
  Product,
  Party,
  Unit,
  Warranty,
  OfflineReceipt,
  CartLine,
} from "../domain/types";
import { useApp } from "../lib/context";
import { money, vnDate } from "../domain/money";
import {
  Badge,
  Button,
  DocTable,
  Empty,
  Field,
  Modal,
  ProductArt,
  kinds,
  modes,
} from "./ui";
import { Receipt } from "./Receipt";
import { statusName } from "../pages/Management";

export default function Dialogs({
  kind,
  value,
  close,
}: {
  kind: string;
  value: unknown;
  close: () => void;
}) {
  const a = useApp(),
    { data: s } = a,
    [saving, setSaving] = useState(false),
    [stockVersion] = useState(s.store.version);
  async function submit(op: string, payload: Record<string, unknown>) {
    setSaving(true);
    try {
      await a.run(op, payload);
      a.notify("Đã ghi nhận thành công.");
      close();
    } catch (e) {
      a.notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  }
  const footer = (
    <div className="form-footer">
      <Button variant="secondary" onClick={close}>
        Đóng
      </Button>
      <Button type="submit" disabled={saving || a.busy}>
        {saving ? "Đang lưu…" : "Xác nhận lưu"}
      </Button>
    </div>
  );
  const wrap = (
    title: string,
    children: React.ReactNode,
    wide = false,
    subtitle?: string,
  ) => (
    <Modal title={title} subtitle={subtitle} onClose={close} wide={wide}>
      {children}
    </Modal>
  );
  if (kind === "product")
    return wrap(
      "Thêm sản phẩm / SKU",
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit("product", Object.fromEntries(f));
        }}
      >
        <div className="two-cols">
          <Field label="Tên sản phẩm">
            <input name="name" required autoFocus />
          </Field>
          <Field label="SKU duy nhất">
            <input name="sku" required placeholder="VD: IP16-128-XANH" />
          </Field>
        </div>
        <div className="two-cols">
          <Field label="Cách quản lý kho">
            <select name="mode">
              <option value="IMEI">IMEI · Điện thoại</option>
              <option value="QUANTITY">Số lượng · Phụ kiện</option>
              <option value="SERIAL">Serial · Từng phụ kiện</option>
            </select>
          </Field>
          <Field label="Hãng">
            <input name="brand" placeholder="Apple, Samsung, Anker…" />
          </Field>
        </div>
        <div className="two-cols">
          <Field label="Màu sắc">
            <input name="color" />
          </Field>
          <Field label="Dung lượng / phiên bản">
            <input name="capacity" />
          </Field>
        </div>
        <Field label="Mã vạch (không bắt buộc)">
          <input
            name="barcode"
            maxLength={100}
            placeholder="Mã trên bao bì, dùng máy quét USB / bàn phím"
          />
        </Field>
        <div className="three-cols">
          <Field label="Giá bán tham khảo">
            <input type="number" name="price" min="0" required />
          </Field>
          <Field label="Tồn tối thiểu">
            <input type="number" name="min_stock" min="0" defaultValue={3} />
          </Field>
          <Field label="Bảo hành đã duyệt (ngày)">
            <input
              type="number"
              name="warranty_days"
              min="0"
              max="3650"
              defaultValue={0}
            />
          </Field>
        </div>
        <div className="notice neutral">
          Giá vốn thực tế lấy từ phiếu nhập và chi phí, không lấy giá tham khảo.
          Cách quản lý không đổi sau khi có giao dịch.
        </div>
        {footer}
      </form>,
      true,
    );
  if (kind === "product_edit") {
    const p = value as Product;
    return wrap(
      "Cập nhật giá / mã vạch",
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit("product_update", {
            ...Object.fromEntries(new FormData(e.currentTarget)),
            variant_id: p.id,
          });
        }}
      >
        <div className="notice neutral">
          {p.sku} · {p.name}. Giá và bảo hành mới chỉ áp dụng cho giao dịch sau;
          chứng từ đã lập và hàng đã cấp quầy giữ nguyên.
        </div>
        <Field label="Giá bán tham khảo">
          <input
            type="number"
            name="price"
            min="0"
            required
            defaultValue={p.price}
          />
        </Field>
        <Field label="Mã vạch">
          <input
            name="barcode"
            maxLength={100}
            defaultValue={p.barcode || ""}
          />
        </Field>
        <div className="two-cols">
          <Field label="Tồn tối thiểu">
            <input
              type="number"
              name="min_stock"
              min="0"
              required
              defaultValue={p.min_stock}
            />
          </Field>
          <Field label="Bảo hành (ngày)">
            <input
              type="number"
              name="warranty_days"
              min="0"
              max="3650"
              required
              defaultValue={p.warranty_days}
            />
          </Field>
        </div>
        {footer}
      </form>,
    );
  }
  if (kind === "party")
    return wrap(
      "Thêm khách hàng / nhà cung cấp",
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(
            "party",
            Object.fromEntries(new FormData(e.currentTarget)),
          );
        }}
      >
        <Field label="Tên đối tác">
          <input name="name" required autoFocus />
        </Field>
        <div className="two-cols">
          <Field label="Số điện thoại (không bắt buộc)">
            <input name="phone" type="tel" />
          </Field>
          <Field label="Vai trò">
            <select name="type" defaultValue={String(value || "CUSTOMER")}>
              <option value="CUSTOMER">Khách hàng</option>
              <option value="SUPPLIER">Nhà cung cấp</option>
              <option value="BOTH">Cả hai vai trò</option>
            </select>
          </Field>
        </div>
        <Field label="Ghi chú">
          <textarea name="note" />
        </Field>
        {footer}
      </form>,
    );
  if (kind === "document" || kind === "document_id") {
    const d =
      kind === "document"
        ? (value as Document)
        : s.documents.find((d) => d.id === value);
    if (!d)
      return wrap(
        "Tra cứu chứng từ",
        <Empty
          title="Đang tải hoặc phiếu chưa nằm trong danh sách"
          detail="Tải lại dữ liệu để xem kết quả. Không tạo lại giao dịch."
          action={<Button onClick={() => void a.refresh()}>Tải lại</Button>}
        />,
      );
    return wrap(
      `${kinds[d.kind]} · ${d.code}`,
      <>
        <div className="document-actions">
          <Badge>Đã ghi sổ</Badge>
          <span>{vnDate(d.posted_at, true)}</span>
          <Button variant="secondary small" onClick={() => window.print()}>
            <Printer size={15} />
            In phiếu
          </Button>
          {["SALE", "PURCHASE"].includes(d.kind) && (
            <>
              <Button
                variant="secondary small"
                onClick={() => a.modal("return", d)}
              >
                Trả hàng / hoàn tiền
              </Button>
              {d.balance !== 0 && (
                <Button
                  variant="secondary small"
                  onClick={() => a.modal("payment", d)}
                >
                  Thanh toán
                </Button>
              )}
            </>
          )}
        </div>
        <div className="document-meta">
          <div>
            <span>Đối tác</span>
            <strong>{d.party_name}</strong>
          </div>
          <div>
            <span>Tổng tiền</span>
            <strong>{money(d.total)}</strong>
          </div>
          <div>
            <span>Thanh toán lúc lập phiếu</span>
            <strong>{money(d.paid)}</strong>
          </div>
          <div>
            <span>{d.balance < 0 ? "Còn phải hoàn" : "Còn nợ"}</span>
            <strong>{money(Math.abs(d.balance))}</strong>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm / định danh</th>
                <th>SL</th>
                <th>Thành tiền</th>
                {s.role === "OWNER" && <th>Giá vốn</th>}
              </tr>
            </thead>
            <tbody>
              {d.lines.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.name}</strong>
                    <small>
                      {l.identifier || l.sku}
                      {l.returned > 0 && ` · Đã trả ${l.returned}`}
                    </small>
                  </td>
                  <td>{l.quantity}</td>
                  <td>{money(l.total)}</td>
                  {s.role === "OWNER" && <td>{money(l.cost)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.note && <div className="notice neutral">{d.note}</div>}
        {d.kind === "SALE" && (
          <Button variant="ghost" onClick={() => a.modal("warranty", d)}>
            Tiếp nhận bảo hành từ phiếu này <ArrowRight size={15} />
          </Button>
        )}
        <div className="print-only">
          <Receipt document={d} store={s.store} />
        </div>
      </>,
      true,
    );
  }
  if (kind === "offline_receipt") {
    const r = value as OfflineReceipt;
    return wrap(
      r.code,
      <>
        <div className="document-actions">
          <Badge tone={r.status === "POSTED" ? "green" : "amber"}>
            {r.status === "POSTED"
              ? "Đã đồng bộ"
              : "Lưu tại quầy · chưa đồng bộ"}
          </Badge>
          <Button onClick={() => window.print()}>
            <Printer size={16} />
            In / in lại phiếu
          </Button>
        </div>
        <Receipt offline={r} store={s.store} />
      </>,
    );
  }
  if (kind === "payment") {
    const d = value as Document;
    return wrap(
      d.balance < 0 ? "Ghi nhận hoàn tiền" : "Thanh toán công nợ",
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit("payment", {
            document_id: d.id,
            amount: Number(f.get("amount")),
            method: f.get("method"),
          });
        }}
      >
        <div className="notice neutral">
          {d.code} · {d.party_name}
          <br />
          Còn {d.balance < 0 ? "phải hoàn" : "cần thanh toán"}:{" "}
          <strong>{money(Math.abs(d.balance))}</strong>
        </div>
        <Field label="Số tiền thực thu / chi">
          <input
            type="number"
            name="amount"
            min="1"
            max={Math.abs(d.balance)}
            defaultValue={Math.abs(d.balance)}
            required
          />
        </Field>
        <Field label="Phương thức đã kiểm chứng">
          <select name="method">
            <option value="CASH">Tiền mặt</option>
            <option value="BANK">Chuyển khoản</option>
          </select>
        </Field>
        {footer}
      </form>,
    );
  }
  if (kind === "return")
    return <ReturnDialog document={value as Document} close={close} />;
  if (kind === "unit") {
    const u = value as Unit,
      p = s.products.find((p) => p.id === u.variant_id)!;
    const history = s.documents.filter((d) =>
      d.lines.some((l) => l.unit_id === u.id),
    );
    return wrap(
      p.name,
      <>
        <div className="unit-detail">
          <ProductArt product={p} />
          <div>
            <Badge tone="neutral">{modes[p.mode]}</Badge>
            <h3 className="mono">{u.identifier}</h3>
            {u.imei2 && <p>IMEI 2: {u.imei2}</p>}
            <p>
              {u.condition} · {statusName(u.status)}
            </p>
            {s.role === "OWNER" && (
              <strong>Giá vốn hiện tại: {money(u.cost)}</strong>
            )}
          </div>
        </div>
        {s.role === "OWNER" && (
          <div className="document-actions">
            <Button variant="secondary" onClick={() => a.modal("status", u)}>
              Đổi trạng thái có lý do
            </Button>
            <Button variant="secondary" onClick={() => a.modal("cost", u)}>
              Ghi chi phí thiết bị
            </Button>
          </div>
        )}
        <DocTable
          documents={history}
          onSelect={(d) => a.modal("document", d)}
          compact
        />
      </>,
      true,
    );
  }
  if (kind === "status") {
    const u = value as Unit;
    return wrap(
      "Chuyển trạng thái thiết bị",
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit("status", {
            unit_id: u.id,
            status: f.get("status"),
            note: f.get("note"),
          });
        }}
      >
        <Field label="Trạng thái mới">
          <select name="status" defaultValue={u.status}>
            <option value="AVAILABLE">Có thể bán</option>
            <option value="QUARANTINE">Chờ kiểm tra</option>
            <option value="REPAIR">Đang sửa chữa</option>
            <option value="DISPOSED">Hủy / mất hàng đã được xác nhận</option>
          </select>
        </Field>
        <Field label="Lý do / kết quả kiểm tra">
          <textarea name="note" required />
        </Field>
        {footer}
      </form>,
    );
  }
  if (kind === "cost") {
    const u = value as Unit;
    return wrap(
      "Ghi chi phí thiết bị",
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit("cost", {
            unit_id: u.id,
            amount: Number(f.get("amount")),
            method: f.get("method"),
            note: f.get("note"),
          });
        }}
      >
        <div className="notice neutral">
          {u.status === "SOLD"
            ? "Chi phí sau bán được ghi bổ sung trong kỳ, không sửa giá vốn hóa đơn cũ."
            : "Chi phí được cộng vào vốn thiết bị, ghi nhận khoản chi thực tế."}
        </div>
        <Field label="Số tiền">
          <input type="number" name="amount" min="1" required />
        </Field>
        <Field label="Nội dung chi phí">
          <input name="note" required />
        </Field>
        <Field label="Thanh toán ngay bằng">
          <select name="method">
            <option value="CASH">Tiền mặt</option>
            <option value="BANK">Chuyển khoản</option>
          </select>
        </Field>
        {footer}
      </form>,
    );
  }
  if (kind === "product_detail") {
    const p = value as Product,
      b = s.balances.find((b) => b.variant_id === p.id);
    return wrap(
      p.name,
      <>
        <div className="unit-detail">
          <ProductArt product={p} />
          <div>
            <Badge tone="neutral">{modes[p.mode]}</Badge>
            <h3>{p.sku}</h3>
            <p>{[p.brand, p.capacity, p.color].filter(Boolean).join(" · ")}</p>
            <strong>Giá bán: {money(p.price)}</strong>
            {p.barcode && <p>Mã vạch: {p.barcode}</p>}
          </div>
        </div>
        {s.role === "OWNER" && (
          <div className="document-actions">
            <Button
              variant="secondary"
              onClick={() => a.modal("product_edit", p)}
            >
              Cập nhật giá / mã vạch
            </Button>
          </div>
        )}
        {p.mode === "QUANTITY" ? (
          <>
            <div className="mini-stats">
              <div>
                <span>Khả dụng</span>
                <strong>{b?.available || 0}</strong>
              </div>
              <div>
                <span>Cấp quầy</span>
                <strong>{b?.reserved || 0}</strong>
              </div>
              <div>
                <span>Cách ly</span>
                <strong>{b?.quarantine || 0}</strong>
              </div>
            </div>
            {(b?.quarantine || 0) > 0 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void submit("quantity_status", {
                    variant_id: p.id,
                    quantity: Number(f.get("quantity")),
                    note: f.get("note"),
                  });
                }}
              >
                <Field label="Số lượng đã kiểm tra, cho phép bán lại">
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    max={b?.quarantine}
                    defaultValue={1}
                  />
                </Field>
                <Field label="Kết quả kiểm tra">
                  <input name="note" required />
                </Field>
                {footer}
              </form>
            )}
          </>
        ) : (
          <div className="unit-picker">
            {s.units
              .filter((u) => u.variant_id === p.id)
              .map((u) => (
                <button key={u.id} onClick={() => a.modal("unit", u)}>
                  <div>
                    <strong className="mono">{u.identifier}</strong>
                    <small>
                      {statusName(u.status)} · {u.condition}
                    </small>
                  </div>
                  <ArrowRight size={17} />
                </button>
              ))}
          </div>
        )}
      </>,
    );
  }
  if (kind === "stocktake")
    return wrap(
      "Kiểm kê tồn khả dụng · hàng số lượng",
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit("adjust", {
            variant_id: f.get("variant_id"),
            count: Number(f.get("count")),
            unit_cost: Number(f.get("unit_cost")),
            note: f.get("note"),
            version: stockVersion,
          });
        }}
      >
        <div className="notice amber">
          Dừng bán và đóng quyền offline trước khi kiểm kê. Hàng thừa cần có giá
          vốn được xác nhận; hệ thống không ghi đè nếu sổ đã thay đổi.
        </div>
        <Field label="Sản phẩm">
          <select name="variant_id">
            {s.products
              .filter((p) => p.mode === "QUANTITY")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · đang có{" "}
                  {s.balances.find((b) => b.variant_id === p.id)?.available ||
                    0}
                </option>
              ))}
          </select>
        </Field>
        <div className="two-cols">
          <Field label="Số lượng khả dụng thực đếm">
            <input name="count" type="number" min="0" required />
          </Field>
          <Field label="Giá vốn một đơn vị hàng thừa">
            <input name="unit_cost" type="number" min="0" defaultValue={0} />
          </Field>
        </div>
        <Field label="Lý do / căn cứ chênh lệch">
          <textarea name="note" required />
        </Field>
        {footer}
      </form>,
    );
  if (kind === "party_detail") {
    const p = value as Party;
    return wrap(
      p.name,
      <>
        <div className="document-meta">
          <div>
            <span>Điện thoại</span>
            <strong>{p.phone || "Chưa bổ sung"}</strong>
          </div>
          <div>
            <span>AR · Phải thu / credit</span>
            <strong>{money(p.ar)}</strong>
          </div>
          <div>
            <span>AP · Phải trả / ứng trước</span>
            <strong>{money(p.ap)}</strong>
          </div>
        </div>
        <DocTable
          documents={s.documents.filter((d) => d.party_id === p.id)}
          onSelect={(d) => a.modal("document", d)}
        />
      </>,
      true,
    );
  }
  if (kind === "member")
    return wrap(
      "Cấp / cập nhật quyền tài khoản",
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit("member", {
            email: f.get("email"),
            role: f.get("role"),
            active: f.get("active") === "on",
          });
        }}
      >
        <div className="notice neutral">
          Tạo hoặc mời tài khoản trong Supabase Authentication trước, sau đó cấp
          quyền tại cửa hàng này. Không dùng chung tài khoản.
        </div>
        <Field label="Email tài khoản">
          <input type="email" name="email" required />
        </Field>
        <Field label="Vai trò">
          <select name="role">
            <option value="STAFF">Nhân viên bán hàng</option>
            <option value="OWNER">Chủ cửa hàng</option>
          </select>
        </Field>
        <label className="checkbox-line">
          <input type="checkbox" name="active" defaultChecked />
          Cho phép tài khoản hoạt động
        </label>
        {footer}
      </form>,
    );
  if (kind === "warranty") {
    const selected = value as Document | undefined;
    return wrap(
      "Tiếp nhận bảo hành",
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit("warranty", {
            sale_line_id: f.get("sale_line_id"),
            issue: f.get("issue"),
          });
        }}
      >
        <Field label="Hàng theo lần bán">
          <select name="sale_line_id">
            {(selected
              ? [selected]
              : s.documents.filter((d) => d.kind === "SALE")
            ).flatMap((d) =>
              d.lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {d.code} · {l.name} · {l.identifier || l.sku} · {d.party_name}
                </option>
              )),
            )}
          </select>
        </Field>
        <Field label="Mô tả lỗi, tình trạng và phụ kiện nhận kèm">
          <textarea name="issue" required />
        </Field>
        <div className="notice neutral">
          Đây là tài sản khách gửi, không tự cộng vào kho bán được hoặc xuất
          thiết bị đổi mới.
        </div>
        {footer}
      </form>,
    );
  }
  if (kind === "warranty_detail") {
    const w = value as Warranty;
    return wrap(
      "Hồ sơ bảo hành",
      <>
        <h3>{w.product}</h3>
        <p className="muted">
          {w.customer} · {w.identifier}
        </p>
        <p>{w.issue}</p>
        <div className="audit-list">
          {w.history.map((h, i) => (
            <div key={i}>
              <Badge tone="neutral">{h.status}</Badge>
              <span>{h.note}</span>
              <small>{vnDate(h.at, true)}</small>
            </div>
          ))}
        </div>
        {s.role === "OWNER" && w.status !== "CLOSED" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void submit("warranty_status", {
                id: w.id,
                status: f.get("status"),
                note: f.get("note"),
              });
            }}
          >
            <Field label="Trạng thái tiếp theo">
              <select name="status">
                <option value="PROCESSING">Đang xử lý</option>
                <option value="CLOSED">Hoàn tất</option>
              </select>
            </Field>
            <Field label="Kết quả / ghi chú xử lý">
              <textarea name="note" required />
            </Field>
            {footer}
          </form>
        )}
      </>,
    );
  }
  if (kind === "grant") return <GrantDialog close={close} />;
  if (kind === "opening") return <OpeningDialog close={close} />;
  return wrap("Thông tin", <Empty title="Không tìm thấy nội dung" />);
}

function OpeningDialog({ close }: { close: () => void }) {
  const a = useApp(),
    [side, setSide] = useState("STOCK"),
    [variant, setVariant] = useState(""),
    [busy, setBusy] = useState(false),
    p = a.data.products.find((p) => p.id === variant);
  return (
    <Modal
      title="Nhập số dư đầu kỳ"
      subtitle="Chỉ dùng trước giao dịch nhập/bán đầu tiên. Không tạo doanh thu hoặc dòng tiền."
      wide
      onClose={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const payload =
            side === "STOCK"
              ? {
                  lines: [
                    {
                      variant_id: variant,
                      quantity:
                        p?.mode === "QUANTITY" ? Number(f.get("quantity")) : 1,
                      price: Number(f.get("cost")),
                      discount: 0,
                      identifier: String(f.get("identifier") || ""),
                      imei2: String(f.get("imei2") || ""),
                      condition: String(f.get("condition") || "Mới"),
                    },
                  ],
                  payments: [],
                }
              : {
                  opening_side: side,
                  party_id: f.get("party_id"),
                  balance: Number(f.get("balance")),
                };
          setBusy(true);
          void a
            .run("opening", payload)
            .then(() => {
              a.notify("Đã ghi nhận số dư đầu kỳ.");
              close();
            })
            .catch((e) => a.notify(e.message, true))
            .finally(() => setBusy(false));
        }}
      >
        <Field label="Loại số dư">
          <select value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="STOCK">Tồn hàng và giá vốn</option>
            <option value="AR">Công nợ phải thu khách hàng</option>
            <option value="AP">Công nợ phải trả nhà cung cấp</option>
          </select>
        </Field>
        {side === "STOCK" ? (
          <>
            <Field label="SKU / biến thể">
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                required
              >
                <option value="">Chọn sản phẩm đã tạo</option>
                {a.data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.sku}
                  </option>
                ))}
              </select>
            </Field>
            {p?.mode === "QUANTITY" ? (
              <Field label="Số lượng">
                <input name="quantity" type="number" min="1" required />
              </Field>
            ) : (
              p && (
                <>
                  <Field label={p.mode === "IMEI" ? "IMEI 1" : "Serial"}>
                    <input name="identifier" required />
                  </Field>
                  {p.mode === "IMEI" && (
                    <Field label="IMEI 2 (nếu có)">
                      <input name="imei2" />
                    </Field>
                  )}
                  <Field label="Tình trạng">
                    <input name="condition" defaultValue="Mới" />
                  </Field>
                </>
              )
            )}
            <Field label="Giá vốn một đơn vị đã đối chiếu">
              <input type="number" name="cost" min="0" required />
            </Field>
          </>
        ) : (
          <>
            <Field label="Đối tác">
              <select name="party_id" required>
                <option value="">Chọn đối tác</option>
                {a.data.parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Số dư có dấu">
              <input name="balance" type="number" required />
              <small>
                Dương: còn phải thu/phải trả. Âm: credit/ứng trước. Cần căn cứ
                đối chiếu.
              </small>
            </Field>
          </>
        )}
        <div className="notice amber">
          Chủ cửa hàng kiểm đủ từng IMEI, số lượng, vốn và nợ trước khi khóa đầu
          kỳ. Các sai lệch sau mở bán phải lập điều chỉnh có lý do.
        </div>
        <div className="form-footer">
          <Button variant="secondary" onClick={close}>
            Đóng
          </Button>
          <Button type="submit" disabled={busy}>
            Ghi nhận đầu kỳ
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReturnDialog({
  document: d,
  close,
}: {
  document: Document;
  close: () => void;
}) {
  const a = useApp(),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [refund, setRefund] = useState(""),
    [exchange, setExchange] = useState(false),
    [newVariant, setNewVariant] = useState(""),
    [newUnit, setNewUnit] = useState(""),
    [newQuantity, setNewQuantity] = useState(1),
    [note, setNote] = useState(""),
    [saving, setSaving] = useState(false);
  const credit = d.lines.reduce(
      (n, l) =>
        n +
        Math.round(
          (l.total * (l.returned + (counts[l.id] || 0))) / l.quantity,
        ) -
        Math.round((l.total * l.returned) / l.quantity),
      0,
    ),
    maxRefund = Math.max(0, credit - d.balance),
    newProduct = a.data.products.find((p) => p.id === newVariant),
    newTotal = (newProduct?.price || 0) * newQuantity,
    usableCredit = Math.min(maxRefund, newTotal);
  return (
    <Modal
      title={`Trả hàng từ ${d.code}`}
      subtitle="Giữ giá trị sau giảm giá và giá vốn lần bán gốc. Hàng nhận lại vào cách ly."
      wide
      onClose={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaving(true);
          void a
            .run(exchange ? "exchange" : "return", {
              document_id: d.id,
              lines: d.lines
                .filter((l) => counts[l.id] > 0)
                .map((l) => ({ line_id: l.id, quantity: counts[l.id] })),
              refund: Number(
                refund === "" ? (d.party_id ? 0 : credit) : refund,
              ),
              method: "CASH",
              note,
              ...(exchange
                ? {
                    new_lines: [
                      {
                        variant_id: newVariant,
                        unit_id: newUnit || undefined,
                        quantity:
                          newProduct?.mode === "QUANTITY" ? newQuantity : 1,
                        price: newProduct?.price || 0,
                        discount: 0,
                      },
                    ],
                    payments:
                      newTotal > usableCredit
                        ? [{ method: "CASH", amount: newTotal - usableCredit }]
                        : [],
                  }
                : {}),
            })
            .then(() => {
              a.notify("Đã ghi nhận trả hàng và phần tiền hoàn.");
              close();
            })
            .catch((e) => a.notify(e.message, true))
            .finally(() => setSaving(false));
        }}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hàng trả</th>
                <th>Còn được trả</th>
                <th>Số lượng trả</th>
              </tr>
            </thead>
            <tbody>
              {d.lines.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.name}</strong>
                    <small>{l.identifier || l.sku}</small>
                  </td>
                  <td>{l.quantity - l.returned}</td>
                  <td>
                    <input
                      aria-label={`Lượng trả ${l.name}`}
                      type="number"
                      min="0"
                      max={l.quantity - l.returned}
                      value={counts[l.id] || 0}
                      onChange={(e) =>
                        setCounts({ ...counts, [l.id]: Number(e.target.value) })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="document-meta">
          <div>
            <span>Giá trị trả</span>
            <strong>{money(credit)}</strong>
          </div>
          <div>
            <span>Nợ trước trả</span>
            <strong>{money(Math.max(0, d.balance))}</strong>
          </div>
          <div>
            <span>Có thể hoàn tối đa</span>
            <strong>{money(maxRefund)}</strong>
          </div>
        </div>
        {d.kind === "SALE" && d.party_id && (
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={exchange}
              onChange={(e) => {
                setExchange(e.target.checked);
                setRefund("0");
              }}
            />
            Đổi sang hàng khác trong cùng giao dịch
          </label>
        )}
        {exchange && (
          <>
            <Field label="Hàng mới giao khách">
              <select
                value={newVariant}
                onChange={(e) => {
                  setNewVariant(e.target.value);
                  setNewUnit("");
                  setNewQuantity(1);
                }}
                required
              >
                <option value="">Chọn sản phẩm mới</option>
                {a.data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price)}
                  </option>
                ))}
              </select>
            </Field>
            {newProduct?.mode === "QUANTITY" ? (
              <Field label="Số lượng mới">
                <input
                  type="number"
                  min="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(Number(e.target.value))}
                />
              </Field>
            ) : (
              <Field label="IMEI / Serial mới">
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  required
                >
                  <option value="">Chọn thiết bị khả dụng</option>
                  {a.data.units
                    .filter(
                      (u) =>
                        u.variant_id === newVariant && u.status === "AVAILABLE",
                    )
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.identifier}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <div className="notice green">
              Dùng credit {money(usableCredit)} · Thu thêm tiền mặt{" "}
              {money(Math.max(0, newTotal - usableCredit))}. Thiếu hàng mới thì
              toàn bộ nghiệp vụ đổi được hủy ở database, giữ phiếu gốc.
            </div>
          </>
        )}
        <Field label="Tiền mặt hoàn ngay / NCC hoàn lại">
          <input
            type="number"
            min="0"
            max={exchange ? Math.max(0, maxRefund - newTotal) : maxRefund}
            value={refund === "" ? (d.party_id ? 0 : credit) : refund}
            onChange={(e) => setRefund(e.target.value)}
          />
          <small>
            Không hoàn ngay thì giữ credit trên chứng từ, không giả định tiền đã
            được trả.
          </small>
        </Field>
        <Field label="Lý do">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />
        </Field>
        <div className="notice neutral">
          Trả độc lập hoặc đổi có liên kết đều giữ lịch sử. Credit dùng để giảm
          nợ/cấn vào đơn đổi, không tạo khoản thu tiền giả.
        </div>
        <div className="form-footer">
          <Button variant="secondary" onClick={close}>
            Đóng
          </Button>
          <Button type="submit" disabled={!credit || saving}>
            {exchange ? "Xác nhận đổi hàng" : "Xác nhận trả hàng"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function GrantDialog({ close }: { close: () => void }) {
  const a = useApp(),
    [quantities, setQuantities] = useState<Record<string, number>>({}),
    [units, setUnits] = useState<string[]>([]),
    [saving, setSaving] = useState(false);
  return (
    <Modal
      title="Cấp hàng cho máy quầy này"
      subtitle="Chỉ hàng được cấp mới bán khi mất Internet. Thiết bị khác không bán được phần hàng này."
      wide
      onClose={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const lines: CartLine[] = Object.entries(quantities)
            .filter(([, q]) => q > 0)
            .map(([id, q]) => ({
              variant_id: id,
              quantity: q,
              price: 0,
              discount: 0,
            }));
          units.forEach((id) => {
            const u = a.data.units.find((u) => u.id === id)!;
            lines.push({
              variant_id: u.variant_id,
              unit_id: id,
              quantity: 1,
              price: 0,
              discount: 0,
            });
          });
          setSaving(true);
          void a
            .run("grant", { terminal_id: a.terminal, lines })
            .then(() => {
              a.notify("Đã cấp hàng và chuẩn bị quyền offline trên máy này.");
              close();
            })
            .catch((e) => a.notify(e.message, true))
            .finally(() => setSaving(false));
        }}
      >
        <div className="grant-picker">
          {a.data.products.map((p) =>
            p.mode === "QUANTITY" ? (
              <label className="grant-row" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {p.sku} · Khả dụng{" "}
                    {a.data.balances.find((b) => b.variant_id === p.id)
                      ?.available || 0}
                  </small>
                </div>
                <input
                  aria-label={`Hạn mức ${p.name}`}
                  type="number"
                  min="0"
                  max={
                    a.data.balances.find((b) => b.variant_id === p.id)
                      ?.available || 0
                  }
                  value={quantities[p.id] || 0}
                  onChange={(e) =>
                    setQuantities({
                      ...quantities,
                      [p.id]: Number(e.target.value),
                    })
                  }
                />
              </label>
            ) : (
              a.data.units
                .filter(
                  (u) => u.variant_id === p.id && u.status === "AVAILABLE",
                )
                .map((u) => (
                  <label className="grant-row" key={u.id}>
                    <input
                      type="checkbox"
                      checked={units.includes(u.id)}
                      onChange={(e) =>
                        setUnits(
                          e.target.checked
                            ? [...units, u.id]
                            : units.filter((x) => x !== u.id),
                        )
                      }
                    />
                    <div>
                      <strong>{p.name}</strong>
                      <small className="mono">{u.identifier}</small>
                    </div>
                    <span>{money(p.price)}</span>
                  </label>
                ))
            ),
          )}
        </div>
        <div className="notice amber">
          Không tự giải phóng hạn mức khi mất liên lạc. Cần đồng bộ đủ phiếu và
          kiểm tra hàng/tiền trước khi đóng phiên.
        </div>
        <div className="form-footer">
          <Button variant="secondary" onClick={close}>
            Đóng
          </Button>
          <Button type="submit" disabled={saving || !a.online}>
            Xác nhận cấp hàng
          </Button>
        </div>
      </form>
    </Modal>
  );
}
