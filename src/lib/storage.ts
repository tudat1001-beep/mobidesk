import type {
  Command,
  CommandResult,
  Grant,
  OfflineReceipt,
  CartLine,
} from "../domain/types";
import type { DemoState } from "../domain/demo";
import { applyDemo, seedDemo } from "../domain/demo";
import { cartTotal, integer } from "../domain/money";

let connection: Promise<IDBDatabase> | undefined;
function db() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("mobidesk-v1", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("records");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
export async function getLocal<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("records", "readonly"),
      r = t.objectStore("records").get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}
export async function putLocal(key: string, value: unknown) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const t = d.transaction("records", "readwrite");
    t.objectStore("records").put(value, key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () =>
      reject(t.error || new Error("Không lưu được dữ liệu trên máy."));
  });
}
export async function getDemo(): Promise<DemoState> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("records", "readwrite"),
      store = t.objectStore("records"),
      r = store.get("demo");
    let state: DemoState;
    r.onsuccess = () => {
      state = r.result || seedDemo();
      state.documents.sort((a, b) => b.posted_at.localeCompare(a.posted_at));
      if (!r.result) store.put(state, "demo");
    };
    t.oncomplete = () => resolve(state!);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
export async function executeDemo(c: Command): Promise<CommandResult> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("records", "readwrite"),
      store = t.objectStore("records"),
      r = store.get("demo");
    let result: CommandResult;
    r.onsuccess = () => {
      try {
        const next = applyDemo(r.result || seedDemo(), c);
        result = next.result;
        store.put(next.state, "demo");
      } catch (error) {
        t.abort();
        reject(error);
      }
    };
    t.oncomplete = () => resolve(result!);
    t.onabort = () =>
      reject(t.error || new Error("Không thể hoàn tất giao dịch minh họa."));
    t.onerror = () => reject(t.error);
  });
}
export async function terminalId() {
  let v = await getLocal<string>("terminal");
  if (!v) {
    v = crypto.randomUUID();
    await putLocal("terminal", v);
  }
  return v;
}
export const scopeKey = (demo: boolean, store: string, user: string) =>
  `${demo ? "demo" : "live:" + projectIdentity()}:${store}:${user}`;
function projectIdentity() {
  try {
    return new URL(
      JSON.parse(localStorage.getItem("mobidesk-installation-v1") || "{}").url,
    ).hostname;
  } catch {
    return "unconfigured";
  }
}
export async function saveGrant(key: string, g: Grant) {
  const existing = await getLocal<Grant>(`grant:${key}`);
  if (existing?.id !== g.id) {
    const pending = (await getLocal<OfflineReceipt[]>(`outbox:${key}`)) || [];
    if (pending.some((r) => r.status !== "POSTED"))
      throw new Error("Còn phiếu chưa đồng bộ, không thể đổi quyền bán.");
  } else if (g.last_sequence < existing.last_sequence)
    throw new Error(
      "Sổ trung tâm đã lùi về mốc cũ. Dừng quầy và đối soát trước khi tiếp tục.",
    );
  await putLocal(`grant:${key}`, g);
}
export const receipts = async (key: string) =>
  (await getLocal<OfflineReceipt[]>(`outbox:${key}`)) || [];
export async function recordOffline(
  key: string,
  identity: { store: string; user: string; terminal: string },
  lines: CartLine[],
  cash: number,
): Promise<OfflineReceipt> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("records", "readwrite"),
      store = t.objectStore("records");
    const rg = store.get(`grant:${key}`);
    let receipt: OfflineReceipt;
    rg.onsuccess = () => {
      const ro = store.get(`outbox:${key}`);
      ro.onsuccess = () => {
        try {
          const g = rg.result as Grant | undefined,
            all = (ro.result || []) as OfflineReceipt[];
          if (
            !g ||
            g.status !== "ACTIVE" ||
            g.store_id !== identity.store ||
            g.user_id !== identity.user ||
            g.terminal_id !== identity.terminal
          )
            throw new Error("Máy này chưa có quyền bán offline.");
          const { total } = cartTotal(lines);
          integer(cash, "Tiền mặt khách đưa");
          if (cash < total)
            throw new Error("Offline chỉ nhận tiền mặt trả đủ.");
          const used = all.filter((r) => r.grant_id === g.id);
          const remaining = g.lines.map((l) => ({
            ...l,
            remaining:
              l.quantity -
              l.consumed -
              used
                .filter((r) => r.sequence > g.last_sequence)
                .reduce(
                  (q, r) =>
                    q +
                    r.lines
                      .filter(
                        (x) =>
                          x.variant_id === l.variant_id &&
                          (l.mode === "QUANTITY" || x.unit_id === l.unit_id),
                      )
                      .reduce((n, x) => n + x.quantity, 0),
                  0,
                ),
          }));
          lines.forEach((l) => {
            const gl = remaining.find(
              (x) =>
                x.variant_id === l.variant_id &&
                (x.mode === "QUANTITY" || x.unit_id === l.unit_id),
            );
            if (
              !gl ||
              gl.remaining < l.quantity ||
              l.discount !== 0 ||
              gl.price !== l.price
            )
              throw new Error("Hàng/giá không thuộc hạn mức offline còn lại.");
            gl.remaining -= l.quantity;
          });
          if (!lines.length) throw new Error("Giỏ hàng đang trống.");
          const sequence =
              Math.max(g.last_sequence, ...used.map((r) => r.sequence)) + 1,
            uuid = crypto.randomUUID();
          receipt = {
            id: uuid,
            grant_id: g.id,
            terminal_id: g.terminal_id,
            user_id: g.user_id,
            store_id: g.store_id,
            sequence,
            occurred_at: new Date().toISOString(),
            lines: structuredClone(lines),
            total,
            cash: total,
            change: cash - total,
            status: "PENDING",
            code: `OFF-${g.id.slice(0, 6).toUpperCase()}-${String(sequence).padStart(4, "0")}`,
            names: lines.map(
              (l) =>
                g.lines.find((x) => x.variant_id === l.variant_id)?.name ||
                "Sản phẩm",
            ),
          };
          store.put([...all, receipt], `outbox:${key}`);
        } catch (e) {
          t.abort();
          reject(e);
        }
      };
    };
    t.oncomplete = () => resolve(receipt!);
    t.onabort = () =>
      reject(
        t.error ||
          new Error(
            "Không lưu được phiếu offline. Không giao hàng hoặc in phiếu thành công.",
          ),
      );
    t.onerror = () => reject(t.error);
  });
}
export async function markReceipt(
  key: string,
  id: string,
  patch: Partial<Pick<OfflineReceipt, "status" | "server_code" | "error">>,
) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const t = d.transaction("records", "readwrite"),
      store = t.objectStore("records"),
      r = store.get(`outbox:${key}`);
    r.onsuccess = () =>
      store.put(
        ((r.result || []) as OfflineReceipt[]).map((v) =>
          v.id === id ? { ...v, ...patch } : v,
        ),
        `outbox:${key}`,
      );
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
export async function downloadBackup(key: string) {
  const body = {
    version: 1,
    exported_at: new Date().toISOString(),
    scope: key,
    terminal: await terminalId(),
    grant: await getLocal(`grant:${key}`),
    receipts: await receipts(key),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `mobidesk-quay-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
