import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  Download,
  Monitor,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { useApp } from "../lib/context";
import {
  downloadBackup,
  getLocal,
  markReceipt,
  receipts,
  scopeKey,
  saveGrant,
} from "../lib/storage";
import { Badge, Button, Empty, PageHeading, Section } from "../components/ui";
import { money, vnDate } from "../domain/money";
import { usePwaStatus } from "../lib/pwa";

export default function Offline() {
  const pwaStatus = usePwaStatus();
  const a = useApp(),
    { data: s } = a,
    [syncing, setSyncing] = useState(false),
    syncingRef = useRef(false),
    [confirmed, setConfirmed] = useState(false);
  const key = scopeKey(a.demo, s.store.id, s.user_id),
    grant = s.grants.find((g) => g.status === "ACTIVE"),
    isTerminal =
      grant?.terminal_id === a.terminal && grant.user_id === s.user_id,
    pending = a.outbox.filter((r) => r.status !== "POSTED");
  async function sync() {
    if (syncingRef.current || !a.online) return;
    syncingRef.current = true;
    setSyncing(true);
    const work = async () => {
      try {
        for (const r of (await receipts(key))
          .filter((r) => r.status !== "POSTED")
          .sort((a, b) => a.sequence - b.sequence)) {
          try {
            const result = await a.run(
              "sale",
              {
                grant_id: r.grant_id,
                terminal_id: r.terminal_id,
                user_id: r.user_id,
                local_id: r.id,
                sequence: r.sequence,
                occurred_at: r.occurred_at,
                lines: r.lines,
                payments: [{ method: "CASH", amount: r.total }],
              },
              r.id,
            );
            await markReceipt(key, r.id, {
              status: "POSTED",
              server_code: result.code,
              error: undefined,
            });
            await a.refreshOutbox();
          } catch (e) {
            await markReceipt(key, r.id, {
              status: "REVIEW",
              error: (e as Error).message,
            });
            await a.refreshOutbox();
            a.notify(
              "Đã dừng đồng bộ. Giữ nguyên phiếu để kiểm tra, không thu tiền lại.",
              true,
            );
            break;
          }
        }
        await a.refresh();
      } catch (e) {
        a.notify((e as Error).message, true);
      }
    };
    try {
      if (navigator.locks)
        await navigator.locks.request(
          `mobidesk-sync-${key}`,
          { ifAvailable: true },
          async (lock) => {
            if (lock) await work();
          },
        );
      else await work();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }
  useEffect(() => {
    if (a.online && isTerminal && a.outbox.some((r) => r.status === "PENDING"))
      void sync();
  }, [
    a.online,
    isTerminal,
    a.outbox.filter((r) => r.status === "PENDING").length,
  ]);
  async function close() {
    if (!grant || !isTerminal || pending.length || !confirmed) return;
    try {
      await a.run("release_grant", {
        grant_id: grant.id,
        last_sequence: Math.max(
          grant.last_sequence,
          ...a.outbox
            .filter((r) => r.grant_id === grant.id)
            .map((r) => r.sequence),
        ),
        terminal_id: a.terminal,
        reconciled: true,
      });
      a.notify("Đã đối soát và trả phần tồn chưa bán về kho online.");
    } catch (e) {
      a.notify((e as Error).message, true);
    }
  }
  return (
    <>
      <PageHeading
        title="Quầy offline & đồng bộ"
        description="Bán và in khi mất Internet, trong phần hàng đã được cấp riêng."
      >
        <Button variant="secondary" onClick={() => void downloadBackup(key)}>
          <Download size={16} />
          Xuất bản sao quầy
        </Button>
        <Button
          onClick={() => a.modal("grant")}
          disabled={!!grant || !a.online}
        >
          <Plus size={16} />
          Cấp hàng cho máy này
        </Button>
      </PageHeading>
      <div className="notice neutral" role="status">
        {pwaStatus}
      </div>
      <div className="mini-stats">
        <div>
          <span>Máy quầy</span>
          <strong className="stat-label">
            {isTerminal
              ? "Đã đăng ký máy này"
              : grant
                ? "Máy khác đang được cấp"
                : "Chưa có phiên cấp hàng"}
          </strong>
        </div>
        <div>
          <span>Phiếu chưa đồng bộ</span>
          <strong>{pending.length}</strong>
        </div>
        <div>
          <span>Tiền chưa lên sổ trung tâm</span>
          <strong>{money(pending.reduce((a, r) => a + r.total, 0))}</strong>
        </div>
        <div>
          <span>Đã đồng bộ trên máy</span>
          <strong>
            {a.outbox.filter((r) => r.status === "POSTED").length}
          </strong>
        </div>
      </div>
      <div className="notice amber">
        <ShieldCheck size={18} />
        <span>
          Chỉ một máy quầy bán offline. Không xóa dữ liệu trình duyệt hoặc đổi
          máy khi còn phiếu chờ. Hàng đã cấp không thể bán online ở thiết bị
          khác.
        </span>
      </div>
      <div className="settings-grid">
        <Section
          title="Hàng được cấp riêng"
          subtitle={
            grant
              ? `Cấp lúc ${vnDate(grant.created_at, true)}`
              : "Chuẩn bị phiên khi còn Internet"
          }
          action={
            <Badge tone={a.online ? "green" : "amber"}>
              {a.online ? "Có kết nối" : "Đang offline"}
            </Badge>
          }
        >
          {grant ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Hàng / định danh</th>
                      <th>Đã cấp</th>
                      <th>Đã lên sổ</th>
                      <th>Giá đã cấp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grant.lines.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <strong>{l.name}</strong>
                          <small>{l.identifier || l.sku}</small>
                        </td>
                        <td>{l.quantity}</td>
                        <td>{l.consumed}</td>
                        <td>{money(l.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel-foot">
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  Tôi đã dừng bán tại quầy, đồng bộ đủ phiếu, kiểm tra tiền và
                  lượng hàng còn lại.
                </label>
                <Button
                  variant="secondary"
                  onClick={() => void close()}
                  disabled={
                    !isTerminal || pending.length > 0 || !confirmed || !a.online
                  }
                >
                  Đóng phiên & trả hàng chưa bán
                </Button>
              </div>
            </>
          ) : (
            <Empty
              title="Máy này chưa có hàng offline"
              detail="Khi còn mạng, chủ cửa hàng cấp IMEI / Serial và lượng phụ kiện cho quầy."
              action={
                <Button onClick={() => a.modal("grant")} disabled={!a.online}>
                  Cấp hàng cho quầy
                </Button>
              }
            />
          )}
        </Section>
        <Section title="Một ca bán an toàn">
          <div className="offline-steps">
            {[
              [
                "01",
                "Chuẩn bị khi còn mạng",
                "Cấp đúng thiết bị và số lượng hàng cho quầy.",
              ],
              [
                "02",
                "Lưu phiếu rồi in",
                "Phiếu phải lưu xong trên máy, có nhãn chưa đồng bộ.",
              ],
              [
                "03",
                "Có mạng: đối soát một lần",
                "Gửi lại cùng mã phiếu, không tạo hóa đơn hoặc nhận tiền lần hai.",
              ],
              [
                "04",
                "Sao lưu & đóng ca",
                "Xuất bản sao định kỳ, kiểm tiền và các phiếu đang chờ.",
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span>{n}</span>
                <div>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <Section
        title="Phiếu bán lưu tại máy"
        subtitle="Dữ liệu này cần được bảo toàn cho tới khi đồng bộ và đối soát xong"
        action={
          <Button
            variant="secondary small"
            onClick={() => void sync()}
            disabled={syncing || !a.online || !isTerminal || !pending.length}
          >
            <RefreshCw size={15} className={syncing ? "spin" : ""} />
            {syncing ? "Đang đồng bộ…" : "Đồng bộ / thử lại"}
          </Button>
        }
      >
        {a.outbox.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phiếu tại quầy</th>
                  <th>Thời gian bán</th>
                  <th>Giá trị</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...a.outbox].reverse().map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.code}</strong>
                      <small>
                        {r.server_code ||
                          r.error ||
                          "Đang chờ ghi sổ trung tâm"}
                      </small>
                    </td>
                    <td>{vnDate(r.occurred_at, true)}</td>
                    <td>{money(r.total)}</td>
                    <td>
                      <Badge
                        tone={
                          r.status === "POSTED"
                            ? "green"
                            : r.status === "REVIEW"
                              ? "red"
                              : "amber"
                        }
                      >
                        {r.status === "POSTED"
                          ? "Đã đồng bộ"
                          : r.status === "REVIEW"
                            ? "Cần kiểm tra"
                            : "Chưa đồng bộ"}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost small"
                        onClick={() => a.modal("offline_receipt", r)}
                      >
                        <Printer size={15} />
                        Xem / in lại
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Chưa có phiếu lưu tại quầy"
            detail="Phiếu offline sẽ xuất hiện sau khi bạn lưu giao dịch bán."
          />
        )}
      </Section>
    </>
  );
}
