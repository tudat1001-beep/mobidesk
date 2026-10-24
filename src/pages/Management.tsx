import { useState, useEffect } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  History,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../lib/context";
import { useReport } from "../lib/reports";
import { loadHistory } from "../lib/gateway";
import type { Document } from "../domain/types";
import {
  Badge,
  Button,
  DocTable,
  Empty,
  PageHeading,
  ProductArt,
  Section,
  modes,
} from "../components/ui";
import { dayKey, money, normalize, vnDate } from "../domain/money";

export function Inventory() {
  const { data: s, modal } = useApp(),
    [q, setQ] = useState(""),
    [tab, setTab] = useState("products"),
    [mode, setMode] = useState("ALL");
  const products = s.products.filter(
    (p) =>
      (mode === "ALL" || p.mode === mode) &&
      normalize(`${p.name} ${p.sku} ${p.barcode || ""} ${p.brand}`).includes(
        normalize(q),
      ),
  );
  const units = s.units.filter((u) => {
    const p = s.products.find((p) => p.id === u.variant_id);
    return (
      p &&
      (mode === "ALL" || p.mode === mode) &&
      normalize(`${p.name} ${p.sku} ${u.identifier} ${u.imei2}`).includes(
        normalize(q),
      ) &&
      (tab !== "quarantine" || ["QUARANTINE", "REPAIR"].includes(u.status))
    );
  });
  return (
    <>
      <PageHeading
        title="Kho hàng"
        description="Mỗi chiếc máy, mỗi phụ kiện đều có một lịch sử rõ ràng."
      >
        <Button variant="secondary" onClick={() => modal("product")}>
          <Plus size={16} />
          Thêm sản phẩm
        </Button>
        <Button onClick={() => modal("stocktake")}>
          <Settings2 size={16} />
          Kiểm kê hàng lượng
        </Button>
      </PageHeading>
      <div className="mini-stats">
        <div>
          <span>Sản phẩm</span>
          <strong>{s.products.length}</strong>
        </div>
        <div>
          <span>Thiết bị còn tại cửa hàng</span>
          <strong>
            {
              s.units.filter((u) =>
                [
                  "AVAILABLE",
                  "QUARANTINE",
                  "REPAIR",
                  "OFFLINE_RESERVED",
                ].includes(u.status),
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Phụ kiện khả dụng</span>
          <strong>{s.balances.reduce((a, b) => a + b.available, 0)}</strong>
        </div>
        <div>
          <span>Hàng lượng cách ly</span>
          <strong>{s.balances.reduce((a, b) => a + b.quarantine, 0)}</strong>
        </div>
      </div>
      <Section
        title="Danh sách tồn kho"
        action={<Badge tone="neutral">1 cửa hàng · 1 kho</Badge>}
      >
        <div className="list-toolbar">
          <div className="tabs">
            {[
              ["products", "Sản phẩm"],
              ["units", "IMEI / Serial"],
              ["quarantine", "Cách ly / sửa"],
              ["movements", "Lịch sử kho"],
            ].map(([k, n]) => (
              <button
                className={tab === k ? "active" : ""}
                key={k}
                onClick={() => setTab(k)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Tìm tên, SKU, IMEI / Serial…"
              aria-label="Tìm trong kho"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            aria-label="Cách quản lý kho"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="ALL">Tất cả cách quản lý</option>
            <option value="IMEI">Theo IMEI</option>
            <option value="QUANTITY">Theo số lượng</option>
            <option value="SERIAL">Theo Serial</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {tab === "movements" ? (
                  <>
                    <th>Chứng từ</th>
                    <th>Sản phẩm</th>
                    <th>Di chuyển</th>
                    <th>Số lượng</th>
                    <th>Thời gian</th>
                  </>
                ) : tab === "products" ? (
                  <>
                    <th>Sản phẩm</th>
                    <th>SKU / Quản lý</th>
                    <th>Giá bán</th>
                    <th>Khả dụng</th>
                    <th>Cấp offline</th>
                    <th />
                  </>
                ) : (
                  <>
                    <th>Thiết bị</th>
                    <th>IMEI / Serial</th>
                    <th>Tình trạng</th>
                    <th>Trạng thái</th>
                    {s.role === "OWNER" && <th>Giá vốn</th>}
                    <th />
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tab === "products"
                ? products.map((p) => {
                    const b = s.balances.find((b) => b.variant_id === p.id),
                      available =
                        p.mode === "QUANTITY"
                          ? b?.available || 0
                          : s.units.filter(
                              (u) =>
                                u.variant_id === p.id &&
                                u.status === "AVAILABLE",
                            ).length,
                      reserved =
                        p.mode === "QUANTITY"
                          ? b?.reserved || 0
                          : s.units.filter(
                              (u) =>
                                u.variant_id === p.id &&
                                u.status === "OFFLINE_RESERVED",
                            ).length;
                    return (
                      <tr key={p.id} onClick={() => modal("product_detail", p)}>
                        <td>
                          <div className="product-cell">
                            <ProductArt product={p} small />
                            <div>
                              <strong>{p.name}</strong>
                              <small>
                                {[p.capacity, p.color]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong className="regular">{p.sku}</strong>
                          <small>{modes[p.mode]}</small>
                        </td>
                        <td className="money-cell">{money(p.price)}</td>
                        <td>
                          <Badge
                            tone={available <= p.min_stock ? "amber" : "green"}
                          >
                            {available} sản phẩm
                          </Badge>
                        </td>
                        <td>{reserved || "—"}</td>
                        <td>
                          <ArrowUpRight size={16} />
                        </td>
                      </tr>
                    );
                  })
                : tab === "movements"
                  ? s.movements
                      .filter((m) =>
                        normalize(`${m.name} ${m.code}`).includes(normalize(q)),
                      )
                      .map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => modal("document_id", m.document_id)}
                        >
                          <td>
                            <strong>{m.code}</strong>
                          </td>
                          <td>{m.name}</td>
                          <td>
                            <small>
                              {statusName(m.from)} → {statusName(m.to)}
                            </small>
                          </td>
                          <td>{m.quantity}</td>
                          <td className="muted">{vnDate(m.at, true)}</td>
                        </tr>
                      ))
                  : units.map((u) => {
                      const p = s.products.find((p) => p.id === u.variant_id)!;
                      return (
                        <tr key={u.id} onClick={() => modal("unit", u)}>
                          <td>
                            <div className="product-cell">
                              <ProductArt product={p} small />
                              <div>
                                <strong>{p.name}</strong>
                                <small>{p.capacity}</small>
                              </div>
                            </div>
                          </td>
                          <td className="mono">
                            {u.identifier}
                            {u.imei2 && <small>IMEI 2: {u.imei2}</small>}
                          </td>
                          <td>{u.condition}</td>
                          <td>
                            <Badge
                              tone={
                                u.status === "AVAILABLE"
                                  ? "green"
                                  : u.status === "SOLD"
                                    ? "neutral"
                                    : "amber"
                              }
                            >
                              {statusName(u.status)}
                            </Badge>
                          </td>
                          {s.role === "OWNER" && (
                            <td className="money-cell">{money(u.cost)}</td>
                          )}
                          <td>
                            <ArrowUpRight size={16} />
                          </td>
                        </tr>
                      );
                    })}
            </tbody>
          </table>
        </div>
        {tab === "quarantine" && !units.length && (
          <Empty
            title="Không có thiết bị cách ly"
            detail="Hàng nhận lại sau trả sẽ được kiểm tra trước khi bán lại."
          />
        )}
      </Section>
    </>
  );
}
export function HistoryPage({ initialQuery = "" }: { initialQuery?: string }) {
  const { data: s, modal, demo } = useApp(),
    [q, setQ] = useState(initialQuery),
    [kind, setKind] = useState("ALL"),
    [offset, setOffset] = useState(0),
    [remote, setRemote] = useState<Document[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => setQ(initialQuery), [initialQuery]);
  useEffect(() => setOffset(0), [q, kind]);
  useEffect(() => {
    if (demo) return;
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      void loadHistory(s.store.id, q, kind, offset)
        .then((rows) => {
          if (live) {
            setRemote(rows);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [demo, s.store.id, s.store.version, q, kind, offset]);
  const docs = demo
    ? s.documents.filter(
        (d) =>
          (kind === "ALL" || d.kind === kind) &&
          normalize(
            `${d.code} ${d.party_name} ${d.lines.map((l) => `${l.name} ${l.identifier}`).join(" ")}`,
          ).includes(normalize(q)),
      )
    : remote;
  return (
    <>
      <PageHeading
        title="Lịch sử giao dịch"
        description="Tra cứu chứng từ, thanh toán, đổi trả và từng thiết bị đã giao."
      />
      <Section
        title="Tất cả giao dịch"
        subtitle="Chạm vào một dòng để xem chi tiết và in lại"
      >
        <div className="list-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label="Tìm giao dịch"
              placeholder="Mã phiếu, khách hàng, IMEI / Serial…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            aria-label="Loại giao dịch"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="ALL">Tất cả giao dịch</option>
            <option value="SALE">Bán hàng</option>
            <option value="PURCHASE">Nhập hàng</option>
            <option value="SALE_RETURN">Trả hàng bán</option>
            <option value="PURCHASE_RETURN">Trả hàng nhập</option>
            <option value="PAYMENT">Thu / chi</option>
            <option value="COST">Chi phí</option>
            <option value="ADJUSTMENT">Điều chỉnh</option>
          </select>
          <span className="muted">{docs.length} giao dịch</span>
        </div>
        {error && <div className="notice red">{error}</div>}
        {loading ? (
          <div className="notice neutral">Đang tải giao dịch…</div>
        ) : (
          <DocTable documents={docs} onSelect={(d) => modal("document", d)} />
        )}
        {!demo && (
          <div className="panel-foot pagination">
            <Button
              variant="secondary small"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - 100))}
            >
              Trang trước
            </Button>
            <span>Trang {offset / 100 + 1}</span>
            <Button
              variant="secondary small"
              disabled={docs.length < 100 || loading}
              onClick={() => setOffset(offset + 100)}
            >
              Trang tiếp
            </Button>
          </div>
        )}
      </Section>
    </>
  );
}
export function Parties() {
  const { data: s, modal } = useApp(),
    [q, setQ] = useState(""),
    [type, setType] = useState("ALL");
  const parties = s.parties.filter(
    (p) =>
      (type === "ALL" || p.type === type || p.type === "BOTH") &&
      normalize(`${p.name} ${p.phone}`).includes(normalize(q)),
  );
  return (
    <>
      <PageHeading
        title="Khách hàng & đối tác"
        description="Thông tin liên hệ và lịch sử mua bán trong cùng một nơi."
      >
        <Button onClick={() => modal("party", "CUSTOMER")}>
          <Plus size={16} />
          Thêm đối tác
        </Button>
      </PageHeading>
      <Section title="Danh sách đối tác">
        <div className="list-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Tìm theo tên hoặc số điện thoại…"
              aria-label="Tìm đối tác"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            aria-label="Vai trò đối tác"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="ALL">Tất cả đối tác</option>
            <option value="CUSTOMER">Khách hàng</option>
            <option value="SUPPLIER">Nhà cung cấp</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Đối tác</th>
                <th>Liên hệ</th>
                <th>Vai trò</th>
                <th>Phải thu</th>
                {s.role === "OWNER" && <th>Phải trả</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {parties.map((p, i) => (
                <tr key={p.id} onClick={() => modal("party_detail", p)}>
                  <td>
                    <div className="person-cell">
                      <span className={`avatar tone-${i % 3}`}>
                        {p.name
                          .split(" ")
                          .slice(-2)
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td>{p.phone || "Chưa bổ sung"}</td>
                  <td>
                    <Badge tone={p.type === "SUPPLIER" ? "blue" : "neutral"}>
                      {p.type === "BOTH"
                        ? "Khách & nhà cung cấp"
                        : p.type === "SUPPLIER"
                          ? "Nhà cung cấp"
                          : "Khách hàng"}
                    </Badge>
                  </td>
                  <td className="money-cell">{money(Math.max(0, p.ar))}</td>
                  {s.role === "OWNER" && (
                    <td className="money-cell">{money(Math.max(0, p.ap))}</td>
                  )}
                  <td>
                    <ArrowUpRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!parties.length && (
          <Empty
            title="Chưa có đối tác"
            action={
              <Button onClick={() => modal("party", "CUSTOMER")}>
                Thêm đối tác đầu tiên
              </Button>
            }
          />
        )}
      </Section>
    </>
  );
}
export function Debts() {
  const { data: s, modal } = useApp(),
    [tab, setTab] = useState("AR");
  const docs = s.documents.filter(
    (d) =>
      d.balance !== 0 &&
      (tab === "AR"
        ? d.kind === "SALE" || (d.kind === "OPENING" && d.account_side === "AR")
        : tab === "AP"
          ? d.kind === "PURCHASE" ||
            (d.kind === "OPENING" && d.account_side === "AP")
          : d.balance < 0),
  );
  return (
    <>
      <PageHeading
        title="Công nợ"
        description="Theo dõi từng khoản phải thu, phải trả và khoản còn phải hoàn."
      />
      <div className="mini-stats">
        <div>
          <span>Khách hàng còn nợ</span>
          <strong>
            {money(s.parties.reduce((a, p) => a + Math.max(0, p.ar), 0))}
          </strong>
        </div>
        {s.role === "OWNER" && (
          <div>
            <span>Còn phải trả nhà cung cấp</span>
            <strong>
              {money(s.parties.reduce((a, p) => a + Math.max(0, p.ap), 0))}
            </strong>
          </div>
        )}
        <div>
          <span>Credit còn phải hoàn khách</span>
          <strong>
            {money(s.parties.reduce((a, p) => a + Math.max(0, -p.ar), 0))}
          </strong>
        </div>
      </div>
      <Section
        title="Đối soát theo chứng từ"
        subtitle="Thu nợ không tạo thêm doanh thu; tiền hoàn được ghi nhận riêng"
      >
        <div className="tabs padded">
          <button
            className={tab === "AR" ? "active" : ""}
            onClick={() => setTab("AR")}
          >
            Phải thu
          </button>
          {s.role === "OWNER" && (
            <button
              className={tab === "AP" ? "active" : ""}
              onClick={() => setTab("AP")}
            >
              Phải trả
            </button>
          )}
          <button
            className={tab === "CREDIT" ? "active" : ""}
            onClick={() => setTab("CREDIT")}
          >
            Credit / hoàn tiền
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Chứng từ</th>
                <th>Đối tác</th>
                <th>Giá trị gốc</th>
                <th>Còn lại</th>
                <th>Thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <button
                      className="text-btn"
                      onClick={() => modal("document", d)}
                    >
                      {d.code}
                    </button>
                    <small>{vnDate(d.posted_at)}</small>
                  </td>
                  <td>{d.party_name}</td>
                  <td>{money(d.total)}</td>
                  <td>
                    <Badge tone={d.balance < 0 ? "blue" : "amber"}>
                      {money(Math.abs(d.balance))}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="secondary small"
                      onClick={() => modal("payment", d)}
                    >
                      {d.balance < 0
                        ? "Ghi nhận hoàn tiền"
                        : d.kind === "SALE"
                          ? "Thu tiền"
                          : "Chi tiền"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!docs.length && (
          <Empty
            title="Không còn khoản cần xử lý"
            detail="Các khoản nợ và credit sẽ được hiển thị theo từng chứng từ."
          />
        )}
      </Section>
    </>
  );
}
export function Reports() {
  const { data: s, modal, demo } = useApp(),
    [from, setFrom] = useState(() => {
      const d = new Date();
      d.setDate(1);
      return dayKey(d.toISOString());
    }),
    [to, setTo] = useState(dayKey(new Date().toISOString()));
  const docs = s.documents.filter(
    (d) => dayKey(d.posted_at) >= from && dayKey(d.posted_at) <= to,
  );
  const { report, error } = useReport(s, demo, from, to),
    revenue = report?.revenue || 0,
    cost = report?.cost || 0,
    income = report?.inflow || 0,
    out = report?.outflow || 0;
  function exportCsv() {
    const rows = [
      ["Mã", "Loại", "Ngày", "Đối tác", "Tổng tiền", "Đã thanh toán"],
      ...docs.map((d) => [
        d.code,
        d.kind,
        vnDate(d.posted_at),
        d.party_name,
        String(d.total),
        String(d.paid),
      ]),
    ];
    const blob = new Blob(
        [
          "\ufeff" +
            rows
              .map((r) =>
                r
                  .map(
                    (c) =>
                      '"' +
                      String(c)
                        .replace(/"/g, '""')
                        .replace(/^[=+@-]/, "'$&") +
                      '"',
                  )
                  .join(","),
              )
              .join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `mobidesk-giao-dich-${from}-${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <PageHeading
        title="Báo cáo kinh doanh"
        description="Phân biệt doanh số, giá vốn, dòng tiền và công nợ."
      >
        <Button variant="secondary" onClick={exportCsv}>
          <Download size={16} />
          Xuất danh sách CSV
        </Button>
      </PageHeading>
      <div className="report-range">
        <label>
          Từ ngày{" "}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <span>→</span>
        <label>
          Đến ngày{" "}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <Badge tone="neutral">Theo ngày ghi sổ · giờ Việt Nam</Badge>
      </div>
      {error && <div className="notice red">{error}</div>}
      {!report && (
        <div className="notice neutral">
          Chưa có số liệu xác nhận cho khoảng ngày này.
        </div>
      )}
      <div className="metrics">
        <div className="metric">
          <span>Doanh thu sau trả hàng</span>
          <strong className="metric-value">
            {report ? money(revenue) : "—"}
          </strong>
          <small>
            {report?.sale_count || 0} đơn bán · {report?.return_count || 0}{" "}
            phiếu trả
          </small>
        </div>
        <div className="metric">
          <span>Giá vốn thuần</span>
          <strong className="metric-value">
            {s.role === "OWNER"
              ? report
                ? money(cost)
                : "—"
              : "Theo phân quyền"}
          </strong>
          <small>Đã tính hoàn nhập và điều chỉnh sau bán</small>
        </div>
        <div className="metric">
          <span>Lợi nhuận gộp quản trị</span>
          <strong className="metric-value green-text">
            {s.role === "OWNER"
              ? report
                ? money(revenue - cost)
                : "—"
              : "Theo phân quyền"}
          </strong>
          <small>Chưa phải lợi nhuận ròng</small>
        </div>
        <div className="metric">
          <span>Dòng tiền thuần</span>
          <strong className="metric-value">
            {report ? money(income - out) : "—"}
          </strong>
          <small>
            Thu {money(income)} · Chi {money(out)}
          </small>
        </div>
      </div>
      <div className="notice neutral">
        Chính sách giá / thuế: {s.store.tax_note || "Chưa được xác nhận."} Phiếu
        offline chưa đồng bộ không nằm trong báo cáo đã ghi sổ.
      </div>
      <Section title="Hiệu quả theo nhóm sản phẩm">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nhóm hàng</th>
                <th>Số lượng thuần</th>
                <th>Doanh thu thuần</th>
                {s.role === "OWNER" && (
                  <>
                    <th>Giá vốn thuần</th>
                    <th>Lãi gộp</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {["IMEI", "QUANTITY", "SERIAL"].map((mode) => {
                const group = report?.groups.find((g) => g.mode === mode),
                  rev = group?.revenue || 0,
                  c = group?.cost || 0;
                return (
                  <tr key={mode}>
                    <td>
                      <strong>
                        {mode === "IMEI"
                          ? "Điện thoại"
                          : mode === "QUANTITY"
                            ? "Phụ kiện số lượng"
                            : "Phụ kiện Serial"}
                      </strong>
                    </td>
                    <td>{group?.quantity || 0}</td>
                    <td>{money(rev)}</td>
                    {s.role === "OWNER" && (
                      <>
                        <td>{money(c)}</td>
                        <td className="green-text">{money(rev - c)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        title="Giao dịch gần đây trong kỳ"
        subtitle="Tối đa 500 chứng từ gần nhất. Tổng hợp phía trên lấy toàn sổ; dùng Lịch sử để tra cứu chứng từ cũ."
      >
        <DocTable documents={docs} onSelect={(d) => modal("document", d)} />
      </Section>
    </>
  );
}
export function Warranties() {
  const { data: s, modal } = useApp();
  return (
    <>
      <PageHeading
        title="Bảo hành"
        description="Tiếp nhận và lưu lịch sử xử lý theo lần bán, IMEI hoặc Serial."
      >
        <Button onClick={() => modal("warranty")}>
          <Plus size={16} />
          Tiếp nhận bảo hành
        </Button>
      </PageHeading>
      <Section
        title="Hồ sơ bảo hành"
        subtitle="Hàng khách gửi không làm tăng tồn sở hữu của cửa hàng"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm / mã</th>
                <th>Khách hàng</th>
                <th>Mô tả lỗi</th>
                <th>Tiếp nhận</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {s.warranties.map((w) => (
                <tr key={w.id} onClick={() => modal("warranty_detail", w)}>
                  <td>
                    <strong>{w.product}</strong>
                    <small className="mono">{w.identifier}</small>
                  </td>
                  <td>{w.customer}</td>
                  <td>{w.issue}</td>
                  <td>{vnDate(w.created_at)}</td>
                  <td>
                    <Badge tone={w.status === "CLOSED" ? "green" : "amber"}>
                      {w.status === "RECEIVED"
                        ? "Đã tiếp nhận"
                        : w.status === "PROCESSING"
                          ? "Đang xử lý"
                          : "Hoàn tất"}
                    </Badge>
                  </td>
                  <td>
                    <ArrowUpRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!s.warranties.length && (
          <Empty
            title="Chưa có hồ sơ bảo hành"
            detail="Tiếp nhận từ hóa đơn bán để giữ đúng lịch sử."
          />
        )}
      </Section>
    </>
  );
}
export function SettingsPage() {
  const { data: s, demo, modal, run, notify } = useApp();
  return (
    <>
      <PageHeading
        title="Cài đặt cửa hàng"
        description="Thông tin, chính sách và quyền truy cập của từng người dùng."
      >
        <Button variant="secondary" onClick={() => modal("opening")}>
          Nhập số dư đầu kỳ
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (
              confirm("Đã đối chiếu đủ tồn, vốn, nợ và muốn khóa nhập đầu kỳ?")
            )
              void run("close_opening", {})
                .then(() => notify("Đã khóa đầu kỳ."))
                .catch((e) => notify(e.message, true));
          }}
        >
          Khóa đầu kỳ
        </Button>
      </PageHeading>
      <div className="settings-grid">
        <Section
          title="Thông tin & chính sách"
          action={<ShieldCheck size={20} className="green-text" />}
        >
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run("settings", {
                name: f.get("name"),
                address: f.get("address"),
                phone: f.get("phone"),
                tax_note: f.get("tax_note"),
                policies_approved: f.get("approved") === "on",
              })
                .then(() => notify("Đã lưu thông tin cửa hàng."))
                .catch((e) => notify(e.message, true));
            }}
          >
            <label className="field">
              <span>Tên cửa hàng</span>
              <input name="name" defaultValue={s.store.name} required />
            </label>
            <div className="two-cols">
              <label className="field">
                <span>Điện thoại</span>
                <input name="phone" defaultValue={s.store.phone} />
              </label>
              <label className="field">
                <span>Múi giờ</span>
                <input value="Việt Nam · UTC+7" disabled />
              </label>
            </div>
            <label className="field">
              <span>Địa chỉ</span>
              <input name="address" defaultValue={s.store.address} />
            </label>
            <label className="field">
              <span>Chính sách giá / thuế quản trị đã được xác nhận</span>
              <textarea
                name="tax_note"
                defaultValue={s.store.tax_note}
                required
                minLength={10}
              />
              <small>
                Chưa hỗ trợ kê khai VAT hoặc phát hành hóa đơn điện tử. Cần đối
                chiếu với người phụ trách kế toán trước khi dùng số lãi để báo
                cáo tài chính.
              </small>
            </label>
            <label className="checkbox-line">
              <input
                type="checkbox"
                name="approved"
                defaultChecked={s.store.policies_approved}
              />
              Tôi xác nhận dùng giá vốn đích danh/bình quân liên hoàn, phân bổ
              giảm giá theo giá trị; đã rà quy tắc thuế, đổi trả và bảo hành để
              cho phép giao dịch thật.
            </label>
            <Button type="submit" disabled={s.role !== "OWNER"}>
              Lưu cài đặt
            </Button>
          </form>
        </Section>
        <Section title="Kết nối & phạm vi">
          <div className="settings-info">
            <span>Database</span>
            <Badge tone={demo ? "amber" : "green"}>
              {demo ? "Chưa kết nối · Minh họa" : "Supabase PostgreSQL"}
            </Badge>
          </div>
          <div className="settings-info">
            <span>Cửa hàng / kho</span>
            <strong>1 / 1</strong>
          </div>
          <div className="settings-info">
            <span>Bán offline</span>
            <strong>1 máy quầy chỉ định</strong>
          </div>
          <div className="settings-info">
            <span>Giá vốn hàng lượng</span>
            <strong>Bình quân liên hoàn</strong>
          </div>
          <div className="settings-info">
            <span>Vai trò hiện tại</span>
            <strong>{s.role === "OWNER" ? "Chủ cửa hàng" : "Nhân viên"}</strong>
          </div>
          <div className="notice neutral">
            {demo
              ? "Đây là dữ liệu minh họa, tách khỏi cửa hàng thật. Cấu hình Supabase để đăng nhập và dùng database của bạn."
              : "Chỉ khóa công khai và phiên người dùng được dùng trên ứng dụng. Quyền ghi sổ được kiểm tra tại database."}
          </div>
        </Section>
      </div>
      <Section
        title="Thành viên"
        action={
          <Button variant="secondary small" onClick={() => modal("member")}>
            <Plus size={15} />
            Cấp quyền tài khoản
          </Button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {s.members.map((m) => (
                <tr key={m.user_id}>
                  <td>{m.email}</td>
                  <td>
                    {m.role === "OWNER" ? "Chủ cửa hàng" : "Nhân viên bán hàng"}
                  </td>
                  <td>
                    <Badge tone={m.active ? "green" : "neutral"}>
                      {m.active ? "Đang hoạt động" : "Đã khóa"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        title="Nhật ký thao tác"
        subtitle="Các thay đổi thành công được ghi cùng giao dịch"
      >
        <div className="audit-list">
          {s.audit.slice(0, 12).map((a) => (
            <div key={a.id}>
              <History size={16} />
              <strong>{a.code || actionName(a.action)}</strong>
              <span>{a.name}</span>
              <small>{vnDate(a.at, true)}</small>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
export function statusName(v: string) {
  return (
    (
      {
        AVAILABLE: "Có thể bán",
        OFFLINE_RESERVED: "Đã cấp quầy",
        SOLD: "Đã bán",
        QUARANTINE: "Chờ kiểm tra",
        REPAIR: "Đang sửa",
        SUPPLIER_RETURNED: "Đã trả NCC",
        DISPOSED: "Đã hủy",
        EXTERNAL: "Bên ngoài",
      } as Record<string, string>
    )[v] || v
  );
}
function actionName(v: string) {
  return (
    (
      {
        sale: "Bán hàng",
        purchase: "Nhập hàng",
        party: "Thêm đối tác",
        product: "Thêm sản phẩm",
        settings: "Cập nhật cài đặt",
        grant: "Cấp hàng quầy",
        release_grant: "Đóng phiên quầy",
        return: "Trả hàng",
        payment: "Thu / chi",
      } as Record<string, string>
    )[v] || v
  );
}
