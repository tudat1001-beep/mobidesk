import type { Document, OfflineReceipt, Snapshot } from "../domain/types";
import { money, vnDate } from "../domain/money";
export function Receipt({
  document: d,
  offline,
  store,
}: {
  document?: Document;
  offline?: OfflineReceipt;
  store: Snapshot["store"];
}) {
  const lines =
    d?.lines ||
    offline?.lines.map((l, i) => ({
      ...l,
      name: offline.names[i],
      total: l.quantity * l.price - l.discount,
      sku: "",
      id: String(i),
    })) ||
    [];
  return (
    <article className="receipt" id="receipt">
      <h2>{store.name}</h2>
      <p>
        {store.address}
        <br />
        {store.phone}
      </p>
      <div className="receipt-dash" />
      <h3>
        {offline
          ? "PHIẾU BÁN TẠI QUẦY"
          : d?.kind === "SALE"
            ? "PHIẾU BÁN HÀNG"
            : "PHIẾU GIAO DỊCH"}
      </h3>
      <p>
        {d?.code || offline?.code}
        <br />
        {vnDate(d?.posted_at || offline!.occurred_at, true)}
      </p>
      {offline && (
        <div className="receipt-warning">
          Đã ghi nhận tại quầy —{" "}
          {offline.status === "POSTED"
            ? `đã đồng bộ ${offline.server_code}`
            : "chưa đồng bộ hệ thống"}
        </div>
      )}
      <div className="receipt-dash" />
      {lines.map((l, i) => (
        <div className="receipt-line" key={i}>
          <div>
            <strong>{l.name}</strong>
            {l.identifier && <small>{l.identifier}</small>}
            <small>
              {l.quantity} × {money(l.price)}
            </small>
          </div>
          <b>{money(l.total)}</b>
        </div>
      ))}
      <div className="receipt-dash" />
      <div className="receipt-total">
        <span>Tổng cộng</span>
        <b>{money(d?.total ?? offline?.total)}</b>
      </div>
      <div className="receipt-total">
        <span>{d ? "Thanh toán lúc lập phiếu" : "Tiền mặt thực thu"}</span>
        <b>{money(d?.paid ?? offline?.cash)}</b>
      </div>
      {d && d.balance !== 0 && (
        <div className="receipt-total">
          <span>{d.balance > 0 ? "Còn nợ" : "Còn phải hoàn"}</span>
          <b>{money(Math.abs(d.balance))}</b>
        </div>
      )}
      {offline && offline.change > 0 && (
        <div className="receipt-total">
          <span>Tiền thừa</span>
          <b>{money(offline.change)}</b>
        </div>
      )}
      <div className="receipt-dash" />
      <small>
        {offline && (
          <>
            Mã tra cứu: {offline.id}
            <br />
          </>
        )}
        Giữ phiếu để tra cứu giao dịch và bảo hành.
        <br />
        Phiếu bán hàng không thay thế hóa đơn điện tử.
      </small>
      <p className="receipt-thanks">Cảm ơn bạn đã tin tưởng!</p>
    </article>
  );
}
