import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Cable,
  ChevronDown,
  Package,
  Plus,
  Smartphone,
  X,
} from "lucide-react";
import type { Product, Document } from "../domain/types";
import { money, vnDate } from "../domain/money";
export const kinds: Record<string, string> = {
  OPENING: "Số dư đầu kỳ",
  SALE: "Bán hàng",
  PURCHASE: "Nhập hàng",
  SALE_RETURN: "Trả hàng bán",
  PURCHASE_RETURN: "Trả hàng nhập",
  PAYMENT: "Thu / chi",
  ADJUSTMENT: "Điều chỉnh kho",
  COST: "Chi phí thiết bị",
};
export const modes = {
  IMEI: "Theo IMEI",
  QUANTITY: "Theo số lượng",
  SERIAL: "Theo Serial",
};
export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Button({
  children,
  onClick,
  variant = "",
  disabled = false,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  return (
    <button
      type={type}
      className={`btn ${variant}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Section({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({
  title = "Chưa có dữ liệu",
  detail = "Các giao dịch của bạn sẽ xuất hiện tại đây.",
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Package size={30} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" aria-label="Đóng" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function ProductArt({
  product,
  small = false,
}: {
  product: Pick<Product, "mode" | "hue" | "name">;
  small?: boolean;
}) {
  return (
    <div
      className={`product-art ${small ? "small" : ""}`}
      style={{ "--product-color": product.hue } as React.CSSProperties}
      aria-hidden="true"
    >
      {product.mode === "IMEI" ? (
        <div className="phone-back">
          <div className="lenses">
            <i />
            <i />
            <i />
          </div>
          <span>●</span>
        </div>
      ) : product.mode === "SERIAL" ? (
        <div className="powerbank">
          <i />
          <i />
          <span>20K</span>
        </div>
      ) : product.name.includes("Kính") ? (
        <div className="glass-phone" />
      ) : product.name.includes("Ốp") ? (
        <div className="phone-case">
          <i />
        </div>
      ) : (
        <Cable className="cable-art" size={small ? 26 : 48} strokeWidth={1.5} />
      )}
    </div>
  );
}
export function DocTable({
  documents,
  onSelect,
  compact = false,
}: {
  documents: Document[];
  onSelect: (d: Document) => void;
  compact?: boolean;
}) {
  if (!documents.length)
    return (
      <Empty
        title="Chưa có giao dịch"
        detail="Tạo phiếu nhập hoặc hóa đơn bán đầu tiên."
      />
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Mã giao dịch</th>
            <th>Khách hàng / đối tác</th>
            {!compact && <th>Thời gian</th>}
            <th>Giá trị</th>
            <th>Trạng thái</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr
              key={d.id}
              onClick={() => onSelect(d)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect(d);
              }}
            >
              <td>
                <div className="doc-id">
                  <span
                    className={`transaction-icon ${d.kind === "SALE" ? "green" : "blue"}`}
                  >
                    {d.kind === "SALE" ? (
                      <ArrowUpRight size={17} />
                    ) : (
                      <ArrowDownLeft size={17} />
                    )}
                  </span>
                  <div>
                    <strong>{d.code}</strong>
                    <small>{kinds[d.kind]}</small>
                  </div>
                </div>
              </td>
              <td>
                <strong className="regular">{d.party_name}</strong>
                {compact && <small>{vnDate(d.posted_at, true)}</small>}
              </td>
              {!compact && (
                <td className="muted">{vnDate(d.posted_at, true)}</td>
              )}
              <td className="money-cell">{money(d.total)}</td>
              <td>
                {d.balance > 0 ? (
                  <Badge tone="amber">Còn nợ</Badge>
                ) : d.balance < 0 ? (
                  <Badge tone="blue">Còn phải hoàn</Badge>
                ) : (
                  <Badge>Hoàn tất</Badge>
                )}
              </td>
              <td>
                <ArrowUpRight size={16} className="muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function SelectLabel({ children }: { children: ReactNode }) {
  return (
    <span className="select-label">
      {children}
      <ChevronDown size={15} />
    </span>
  );
}
export function AddButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick}>
      <Plus size={17} />
      {children}
    </Button>
  );
}
