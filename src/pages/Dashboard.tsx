import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Package,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../lib/context";
import { useReport } from "../lib/reports";
import { money, compactMoney, dayKey } from "../domain/money";
import {
  Badge,
  Button,
  DocTable,
  Empty,
  PageHeading,
  ProductArt,
  Section,
} from "../components/ui";

export default function Dashboard() {
  const { data: s, demo, navigate, modal, outbox } = useApp(),
    [range, setRange] = useState(7);
  const today = dayKey(new Date().toISOString()),
    sales = s.documents.filter((d) => d.kind === "SALE"),
    todaySales = sales.filter((d) => dayKey(d.posted_at) === today),
    returns = s.documents.filter(
      (d) => d.kind === "SALE_RETURN" && dayKey(d.posted_at) === today,
    );
  const start = new Date();
  start.setDate(start.getDate() - range + 1);
  const { report, error } = useReport(
    s,
    demo,
    dayKey(start.toISOString()),
    today,
  );
  if (!report)
    return (
      <>
        <PageHeading
          title="Tổng quan cửa hàng"
          description="Thông tin từ sổ giao dịch đã xác nhận."
        />
        <Section title={error ? "Chưa tải được báo cáo" : "Đang tải báo cáo"}>
          <Empty
            title={error || "Đang tổng hợp dữ liệu…"}
            detail="Không dùng số liệu từ danh sách gần đây thay cho toàn bộ sổ."
          />
        </Section>
      </>
    );
  const latest = report.daily.find((d) => d.day === today),
    revenue = latest?.revenue || 0,
    cost = latest?.cost || 0,
    inventory = report.inventory_value || 0,
    debt = report.receivables,
    pending = outbox.filter((r) => r.status !== "POSTED");
  const days = report.daily.map((d) => ({
    label: `${Number(d.day.slice(8))}/${Number(d.day.slice(5, 7))}`,
    value: d.revenue,
    cost: d.cost || 0,
  }));
  const peak = Math.max(...days.map((d) => d.value), 1000000),
    chartW = 650,
    chartH = 174,
    gap = chartW / days.length,
    points = days
      .map(
        (d, i) =>
          `${i * gap + gap / 2},${chartH - (d.value / peak) * (chartH - 18)}`,
      )
      .join(" ");
  const low = s.products
    .filter(
      (p) =>
        !p.archived &&
        (p.mode === "QUANTITY"
          ? s.balances.find((b) => b.variant_id === p.id)?.available || 0
          : s.units.filter(
              (u) => u.variant_id === p.id && u.status === "AVAILABLE",
            ).length) <= p.min_stock,
    )
    .slice(0, 4);
  const cash = report.cash,
    bank = report.bank,
    received = cash + bank,
    cashShare = received ? Math.round((cash / received) * 100) : 0;
  const best = s.products
    .map((p) => ({
      ...p,
      sold: sales
        .flatMap((d) => d.lines)
        .filter((l) => l.variant_id === p.id)
        .reduce((a, l) => a + l.quantity - l.returned, 0),
    }))
    .filter((p) => p.sold > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 4);
  return (
    <>
      <PageHeading
        title="Tổng quan cửa hàng"
        description="Chào buổi sáng, cùng xem cửa hàng của bạn hôm nay nhé."
      >
        <span className="date-chip">
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </span>
        <Button onClick={() => navigate("sales")}>
          <Plus size={17} />
          Tạo đơn bán
        </Button>
      </PageHeading>
      {pending.length > 0 && (
        <div className="notice amber">
          <span>
            {pending.length} phiếu tại quầy chưa đồng bộ ·{" "}
            {money(pending.reduce((a, r) => a + r.total, 0))}. Số liệu dưới đây
            chưa bao gồm các phiếu này.
          </span>
          <button onClick={() => navigate("offline")}>
            Đối soát ngay <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="metrics">
        <Metric
          title="Doanh thu hôm nay"
          value={money(revenue)}
          icon={<CircleDollarSign />}
          footer={`${latest?.sale_count || 0} đơn bán trong ngày`}
          color="green"
        />
        <Metric
          title="Lợi nhuận gộp"
          value={s.role === "OWNER" ? money(revenue - cost) : "Theo phân quyền"}
          icon={<TrendingUp />}
          footer="Doanh thu thuần trừ giá vốn"
          color="purple"
        />
        <Metric
          title="Công nợ phải thu"
          value={money(debt)}
          icon={<Wallet />}
          footer={`${s.parties.filter((p) => p.ar > 0).length} khách hàng còn nợ`}
          color="orange"
        />
        <Metric
          title="Giá trị tồn kho"
          value={s.role === "OWNER" ? money(inventory) : "Theo phân quyền"}
          icon={<Package />}
          footer={`${s.products.length} sản phẩm đang quản lý`}
          color="blue"
        />
      </div>
      <div className="dashboard-grid">
        <Section
          title="Tình hình kinh doanh"
          subtitle="Doanh thu và giá vốn theo ngày"
          className="business-chart"
          action={
            <select
              aria-label="Khoảng thời gian biểu đồ"
              className="select-small"
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
            >
              <option value={7}>7 ngày qua</option>
              <option value={14}>14 ngày qua</option>
              <option value={30}>30 ngày qua</option>
            </select>
          }
        >
          <div className="chart-summary">
            <strong>{money(days.reduce((a, d) => a + d.value, 0))}</strong>
            <span>
              <i className="legend green" />
              Doanh thu{" "}
              {s.role === "OWNER" && (
                <>
                  <i className="legend pale" />
                  Giá vốn
                </>
              )}
            </span>
          </div>
          <div className="chart">
            <div className="chart-axis">
              {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                <span key={f}>{compactMoney(peak * f)}</span>
              ))}
            </div>
            <div className="chart-body">
              <div className="chart-lines">
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} />
                ))}
              </div>
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                role="img"
                aria-label="Biểu đồ doanh thu"
              >
                <defs>
                  <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2c9067" stopOpacity=".15" />
                    <stop offset="100%" stopColor="#2c9067" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,${chartH} ${points} ${chartW},${chartH}`}
                  fill="url(#chart-fill)"
                />
                {days.map((d, i) => (
                  <g key={i}>
                    <title>
                      {d.label}: {money(d.value)}
                    </title>
                    {s.role === "OWNER" && (
                      <rect
                        x={i * gap + gap * 0.22}
                        y={chartH - (d.cost / peak) * (chartH - 18)}
                        width={gap * 0.56}
                        height={(d.cost / peak) * (chartH - 18)}
                        rx="4"
                        fill="#dbede4"
                      />
                    )}
                  </g>
                ))}
                <polyline
                  points={points}
                  fill="none"
                  stroke="#21845b"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                {days.map((d, i) => (
                  <circle
                    key={i}
                    cx={i * gap + gap / 2}
                    cy={chartH - (d.value / peak) * (chartH - 18)}
                    r="3.5"
                    fill="white"
                    stroke="#21845b"
                    strokeWidth="2"
                  />
                ))}
              </svg>
              <div className="chart-labels">
                {days.map((d, i) => (
                  <span key={i}>
                    {range > 14 && i % 4 !== 0 ? "" : d.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>
        <Section
          title="Phương thức thanh toán"
          subtitle="Tiền đã nhận từ các giao dịch"
        >
          <div className="donut-container">
            <div
              className="donut"
              style={{
                background: `conic-gradient(#247b55 0 ${cashShare}%, #c5ddcf ${cashShare}% 100%)`,
              }}
            >
              <div>
                <span>Thực thu</span>
                <strong>{compactMoney(received)}</strong>
                <small>Trong khoảng ngày đang chọn</small>
              </div>
            </div>
          </div>
          <div className="payment-stat">
            <span>
              <i className="legend green" />
              Tiền mặt
            </span>
            <b>{money(cash)}</b>
            <small>{cashShare}%</small>
          </div>
          <div className="payment-stat">
            <span>
              <i className="legend pale" />
              Chuyển khoản
            </span>
            <b>{money(bank)}</b>
            <small>{received ? 100 - cashShare : 0}%</small>
          </div>
          <div className="panel-foot">
            <Badge tone="neutral">
              <CreditCard size={13} /> Dựa trên tiền thực nhận
            </Badge>
          </div>
        </Section>
      </div>
      <div className="dashboard-grid lower">
        <Section
          title="Giao dịch gần đây"
          subtitle="Theo dõi các hoạt động mới nhất tại cửa hàng"
          action={
            <button className="text-btn" onClick={() => navigate("history")}>
              Xem tất cả <ArrowRight size={15} />
            </button>
          }
        >
          <DocTable
            documents={s.documents
              .filter((d) =>
                ["SALE", "PURCHASE", "SALE_RETURN", "PAYMENT"].includes(d.kind),
              )
              .slice(0, 5)}
            compact
            onSelect={(d) => modal("document", d)}
          />
        </Section>
        <Section
          title="Cần nhập thêm"
          subtitle="Các sản phẩm chạm ngưỡng tồn thấp"
          action={<Badge tone="amber">{low.length} sản phẩm</Badge>}
        >
          {low.length ? (
            low.map((p) => {
              const stock =
                p.mode === "QUANTITY"
                  ? s.balances.find((b) => b.variant_id === p.id)?.available ||
                    0
                  : s.units.filter(
                      (u) => u.variant_id === p.id && u.status === "AVAILABLE",
                    ).length;
              return (
                <div key={p.id} className="stock-row">
                  <ProductArt product={p} small />
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.sku}</small>
                  </div>
                  <div className="stock-count">
                    <b>{stock}</b>
                    <small>còn lại</small>
                  </div>
                </div>
              );
            })
          ) : (
            <Empty
              title="Tồn kho ổn định"
              detail="Chưa có sản phẩm cần nhập thêm."
            />
          )}
          <div className="panel-foot">
            <button className="text-btn" onClick={() => navigate("purchases")}>
              Tạo phiếu nhập hàng <ArrowRight size={15} />
            </button>
          </div>
        </Section>
      </div>
      <Section
        title="Sản phẩm bán chạy"
        subtitle="Những sản phẩm được khách hàng lựa chọn nhiều nhất"
        action={
          <button className="text-btn" onClick={() => navigate("reports")}>
            Xem báo cáo <ArrowRight size={15} />
          </button>
        }
      >
        <div className="bestsellers">
          {best.map((p, i) => (
            <button
              key={p.id}
              onClick={() => navigate("inventory")}
              className="best-card"
            >
              <span className="rank">0{i + 1}</span>
              <ProductArt product={p} small />
              <div>
                <strong>{p.name}</strong>
                <small>{p.sold} sản phẩm đã bán</small>
              </div>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}
function Metric({
  title,
  value,
  icon,
  footer,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  footer: string;
  color: string;
}) {
  return (
    <section className="metric">
      <div className="metric-title">
        <span>{title}</span>
        <i className={`metric-icon ${color}`}>{icon}</i>
      </div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-footer">
        <span className="tiny-dot" />
        {footer}
      </div>
    </section>
  );
}
