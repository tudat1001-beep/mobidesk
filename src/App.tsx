import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudOff,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  Users,
  Wallet,
  WifiOff,
  X,
  BookOpen,
} from "lucide-react";
import type { Snapshot, OfflineReceipt, Grant, Command } from "./domain/types";
import { AppContext } from "./lib/context";
import {
  configured,
  supabase,
  snapshot,
  execute,
  bootstrap,
} from "./lib/gateway";
import {
  getLocal,
  putLocal,
  receipts,
  saveGrant,
  scopeKey,
  terminalId,
} from "./lib/storage";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import {
  Inventory,
  HistoryPage,
  Parties,
  Debts,
  Reports,
  Warranties,
  SettingsPage,
} from "./pages/Management";
import Offline from "./pages/Offline";
import Dialogs from "./components/Dialogs";
import Setup from "./components/Setup";
import UserGuide from "./pages/UserGuide";
import { installation } from "./lib/configuration";
import { Button, Field } from "./components/ui";

const navigation = [
  ["dashboard", "Tổng quan", LayoutDashboard],
  ["sales", "Bán hàng", ShoppingBag],
  ["purchases", "Nhập hàng", Truck],
  ["inventory", "Kho hàng", Package],
  ["debts", "Công nợ", Wallet],
  ["customers", "Khách hàng", Users],
  ["reports", "Báo cáo", BarChart3],
] as const;
const secondary = [
  ["history", "Lịch sử giao dịch", History],
  ["warranty", "Bảo hành", ShieldCheck],
  ["offline", "Quầy offline", Cloud],
  ["settings", "Cài đặt", Settings],
  ["guide", "Hướng dẫn sử dụng", BookOpen],
] as const;
export default function App() {
  const [demo, setDemo] = useState(!configured),
    [data, setData] = useState<Snapshot | null>(null),
    [page, setPage] = useState(location.hash.slice(1) || "dashboard"),
    [online, setOnline] = useState(navigator.onLine),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [session, setSession] = useState(false),
    [noStore, setNoStore] = useState(false),
    [terminal, setTerminal] = useState(""),
    [outbox, setOutbox] = useState<OfflineReceipt[]>([]),
    [dialog, setDialog] = useState<{ kind: string; value?: unknown } | null>(
      null,
    ),
    [toast, setToast] = useState<{ message: string; error: boolean } | null>(
      null,
    ),
    [mobileMenu, setMobileMenu] = useState(false),
    [globalSearch, setGlobalSearch] = useState(""),
    [pending, setPending] = useState<Command | null>(null);
  const dataRef = useRef(data),
    inFlight = useRef(false);
  dataRef.current = data;
  const notify = useCallback(
    (message: string, error = false) => setToast({ message, error }),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (next: string) => {
    setPage(next);
    location.hash = next;
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    const hash = () => setPage(location.hash.slice(1) || "dashboard");
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        location.hash = "thiet-lap";
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    void terminalId().then(setTerminal);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  const refreshOutbox = useCallback(async () => {
    const s = dataRef.current;
    if (s) setOutbox(await receipts(scopeKey(demo, s.store.id, s.user_id)));
  }, [demo]);
  const refresh = useCallback(async () => {
    const next = await snapshot(demo, dataRef.current?.store.id);
    setData(next);
    dataRef.current = next;
    const key = scopeKey(demo, next.store.id, next.user_id),
      t = await terminalId();
    const g = next.grants.find(
      (g) =>
        g.status === "ACTIVE" &&
        g.user_id === next.user_id &&
        g.terminal_id === t,
    );
    if (g) {
      await saveGrant(key, g);
      if (!demo) {
        const ids = new Set(g.lines.map((l) => l.variant_id));
        const cached: Snapshot = {
          ...next,
          products: next.products.filter((p) => ids.has(p.id)),
          units: next.units
            .filter((u) => g.lines.some((l) => l.unit_id === u.id))
            .map(({ cost, ...u }) => u),
          balances: next.balances
            .filter((b) => ids.has(b.variant_id))
            .map(({ value, ...b }) => b),
          documents: [],
          movements: [],
          parties: [],
          audit: [],
          warranties: [],
          members: [],
        };
        await putLocal("offline-context", cached);
      }
    } else {
      const old = await getLocal<Grant>(`grant:${key}`);
      if (old?.status === "ACTIVE")
        await putLocal(`grant:${key}`, { ...old, status: "CLOSED" });
      if (!demo) await putLocal("offline-context", null);
    }
    setOutbox(await receipts(key));
    setPending((await getLocal<Command>(`pending:${key}`)) || null);
  }, [demo]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setData(null);
    dataRef.current = null;
    const load = async () => {
      try {
        if (demo) {
          await refresh();
          setSession(true);
        } else {
          const { data: auth, error: authError } =
            await supabase!.auth.getSession();
          if (authError) throw authError;
          setSession(!!auth.session);
          if (auth.session) {
            try {
              await refresh();
              setNoStore(false);
            } catch (e) {
              if (String((e as Error).message).includes("NO_STORE"))
                setNoStore(true);
              else throw e;
            }
          }
        }
      } catch (e) {
        const cached =
          !navigator.onLine ||
          /fetch|network|timeout|abort/i.test((e as Error).message)
            ? await getLocal<Snapshot>("offline-context")
            : null;
        if (cached) {
          setData(cached);
          dataRef.current = cached;
          setSession(true);
          setError(
            "Đang dùng dữ liệu quầy đã tải. Chỉ bán trong hạn mức được cấp; các tác vụ trung tâm cần kết nối lại.",
          );
          setOutbox(
            await receipts(scopeKey(false, cached.store.id, cached.user_id)),
          );
        } else if (live) setError((e as Error).message);
      } finally {
        if (live) setLoading(false);
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [demo, refresh]);
  const run = async (
    operation: string,
    payload: Record<string, unknown>,
    requestId?: string,
  ) => {
    const s = dataRef.current;
    if (!s) throw new Error("Dữ liệu chưa sẵn sàng.");
    if (!navigator.onLine && !demo)
      throw new Error("Cần có kết nối để ghi sổ trung tâm.");
    if (inFlight.current)
      throw new Error("Một giao dịch khác đang được xác nhận.");
    inFlight.current = true;
    setBusy(true);
    try {
      const key = scopeKey(demo, s.store.id, s.user_id),
        old = await getLocal<Command>(`pending:${key}`),
        command: Command = {
          request_id: requestId || old?.request_id || crypto.randomUUID(),
          operation,
          payload,
        };
      if (
        old &&
        (old.operation !== operation ||
          JSON.stringify(old.payload) !== JSON.stringify(payload) ||
          old.request_id !== command.request_id)
      )
        throw new Error(
          "Còn một yêu cầu chưa rõ kết quả. Xác minh yêu cầu trước trước khi tạo giao dịch mới.",
        );
      await putLocal(`pending:${key}`, command);
      setPending(command);
      try {
        const result = await execute(demo, s.store.id, command);
        await putLocal(`pending:${key}`, null);
        setPending(null);
        try {
          await refresh();
        } catch {
          notify(
            `Đã ghi nhận ${result.code || ""}; cần tải lại danh sách khi kết nối ổn định.`,
          );
        }
        return result;
      } catch (e) {
        const msg = (e as Error).message;
        if (!/fetch|network|timeout|abort|Failed|kết nối/i.test(msg)) {
          await putLocal(`pending:${key}`, null);
          setPending(null);
        }
        throw e;
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  async function logout() {
    if (outbox.some((r) => r.status !== "POSTED")) {
      notify(
        "Còn phiếu chưa đồng bộ. Hãy đồng bộ hoặc bàn giao quầy; hệ thống sẽ giữ phiếu.",
        true,
      );
      navigate("offline");
      return;
    }
    if (!demo) await supabase?.auth.signOut();
    setData(null);
    dataRef.current = null;
    setSession(false);
    if (demo) {
      setDemo(false);
      setLoading(false);
    }
  }
  const currentLabel =
    [...navigation, ...secondary].find(([k]) => k === page)?.[1] || "Tổng quan";
  if (page === "thiet-lap") return <Setup />;
  if (page === "guide")
    return <UserGuide onBack={() => navigate("dashboard")} />;
  if (loading)
    return (
      <div className="loading-screen">
        <img src="/icon.svg" alt="MobiDesk" />
        <h2>MobiDesk</h2>
        <span>Đang chuẩn bị cửa hàng…</span>
        <i className="loader" />
      </div>
    );
  if (!session || !data)
    return (
      <Login
        demo={() => {
          setDemo(true);
          setSession(true);
          void refresh();
        }}
        noStore={noStore}
        error={error}
        onSuccess={async () => {
          setSession(true);
          setLoading(true);
          try {
            await refresh();
            setNoStore(false);
            setError("");
          } catch (e) {
            const msg = (e as Error).message;
            if (msg.includes("NO_STORE")) setNoStore(true);
            else setError(msg);
          } finally {
            setLoading(false);
          }
        }}
      />
    );
  return (
    <AppContext
      value={{
        data,
        demo,
        online,
        busy,
        terminal,
        outbox,
        run,
        refresh,
        navigate,
        modal: (kind, value) => setDialog({ kind, value }),
        notify,
        refreshOutbox,
      }}
    >
      <div className="app-layout">
        <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
          <a
            className="brand"
            href="#dashboard"
            onClick={() => navigate("dashboard")}
          >
            <img src="/icon.svg" alt="" />
            <div>
              <strong>
                MobiDesk<span>®</span>
              </strong>
              <small>Quản lý cửa hàng dễ dàng</small>
            </div>
          </a>
          <div className="store-switch">
            <span className="store-avatar">
              <Smartphone size={20} />
            </span>
            <div>
              <strong>{data.store.name}</strong>
              <small>Cửa hàng chính</small>
            </div>
            <ChevronDown size={15} />
          </div>
          <span className="nav-label">KHÔNG GIAN LÀM VIỆC</span>
          <nav>
            {navigation.map(([id, label, Icon]) => (
              <button
                key={id}
                className={page === id ? "active" : ""}
                onClick={() => navigate(id)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === "debts" && data.parties.some((p) => p.ar > 0) && (
                  <i>{data.parties.filter((p) => p.ar > 0).length}</i>
                )}
                {page === id && <span className="nav-active-dot" />}
              </button>
            ))}
          </nav>
          <div className="nav-divider" />
          <span className="nav-label">CÔNG CỤ & QUẢN TRỊ</span>
          <nav>
            {secondary.map(([id, label, Icon]) => (
              <button
                key={id}
                className={page === id ? "active" : ""}
                onClick={() => navigate(id)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === "offline" &&
                  outbox.some((r) => r.status !== "POSTED") && (
                    <i>{outbox.filter((r) => r.status !== "POSTED").length}</i>
                  )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button
              className="connection-card"
              onClick={() => navigate("offline")}
            >
              <span className={`connection-symbol ${online ? "" : "offline"}`}>
                {online ? <Cloud size={20} /> : <WifiOff size={20} />}
              </span>
              <div>
                <strong>
                  {online ? "Kết nối ổn định" : "Đang mất kết nối"}
                </strong>
                <small>
                  {demo
                    ? "Chế độ minh họa"
                    : data.grants.length
                      ? "Quầy đã có quyền offline"
                      : "Dữ liệu trên Supabase"}
                </small>
              </div>
              <ChevronRight size={15} />
            </button>
            <div className="sidebar-user">
              <span className="avatar">NM</span>
              <div>
                <strong>
                  {demo
                    ? "Nguyễn Minh"
                    : data.members
                        .find((m) => m.user_id === data.user_id)
                        ?.email?.split("@")[0] || "Tài khoản cửa hàng"}
                </strong>
                <small>
                  {data.role === "OWNER"
                    ? "Chủ cửa hàng"
                    : "Nhân viên bán hàng"}
                </small>
              </div>
              <button
                className="icon-btn"
                title="Đăng xuất"
                onClick={() => void logout()}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        {mobileMenu && (
          <div className="sidebar-scrim" onClick={() => setMobileMenu(false)} />
        )}
        <div className="app-body">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-btn mobile-only"
                aria-label="Mở menu"
                onClick={() => setMobileMenu(true)}
              >
                <Menu size={21} />
              </button>
              <span>Không gian làm việc</span>
              <ChevronRight size={13} />
              <strong>{currentLabel}</strong>
            </div>
            <div className="topbar-tools">
              <form
                className="global-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate("history");
                }}
              >
                <Search size={16} />
                <input
                  aria-label="Tìm giao dịch nhanh"
                  placeholder="Tìm kiếm nhanh…"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
                <kbd>Enter</kbd>
              </form>
              <button
                className="notification-btn"
                aria-label="Xem hàng cần nhập và phiếu chờ"
                onClick={() => {
                  if (outbox.some((r) => r.status !== "POSTED"))
                    navigate("offline");
                  else navigate("inventory");
                }}
              >
                <Bell size={19} />
                <i />
              </button>
              <span className="topbar-divider" />
              <span className="avatar small">NM</span>
            </div>
          </header>
          {demo && (
            <div className="demo-strip">
              <span>
                <span className="tiny-dot" />
                Dữ liệu minh họa · Các thao tác thử không ảnh hưởng cửa hàng
                thật
              </span>
              <button
                onClick={() => {
                  if (configured) {
                    setDemo(false);
                    setSession(false);
                  } else
                    notify(
                      "Cần cấu hình Project URL và publishable key Supabase để kết nối dữ liệu thật.",
                    );
                }}
              >
                Kết nối cửa hàng <ArrowRight size={13} />
              </button>
            </div>
          )}
          <main>
            {installation.warning && (
              <div className="notice amber">{installation.warning}</div>
            )}
            {pending && (
              <div className="notice amber">
                <span>
                  Đang giữ mã yêu cầu chưa xác định kết quả. Không tạo lại giao
                  dịch.
                </span>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      pending.operation,
                      pending.payload,
                      pending.request_id,
                    )
                      .then(() => notify("Đã xác minh kết quả giao dịch."))
                      .catch((e) => notify(e.message, true))
                  }
                >
                  Xác minh lại
                </button>
              </div>
            )}
            {error && <div className="notice red">{error}</div>}
            {page === "dashboard" ? (
              <Dashboard />
            ) : page === "sales" ? (
              <Sales key="sale" />
            ) : page === "purchases" ? (
              <Sales key="purchase" purchase />
            ) : page === "inventory" ? (
              <Inventory />
            ) : page === "customers" ? (
              <Parties />
            ) : page === "debts" ? (
              <Debts />
            ) : page === "reports" ? (
              <Reports />
            ) : page === "history" ? (
              <HistoryPage initialQuery={globalSearch} />
            ) : page === "warranty" ? (
              <Warranties />
            ) : page === "offline" ? (
              <Offline />
            ) : page === "settings" ? (
              <SettingsPage />
            ) : (
              <Dashboard />
            )}
            <footer className="app-footer">
              <span>
                © 2026 MobiDesk · Mỗi giao dịch, một lịch sử rõ ràng.
              </span>
              <span>
                <span className="tiny-dot" />
                {demo
                  ? "Phiên trải nghiệm"
                  : online
                    ? "Đã kết nối Supabase"
                    : "Chưa kết nối mạng"}
              </span>
            </footer>
          </main>
          <nav className="mobile-bottom">
            {navigation
              .filter(([id]) =>
                ["dashboard", "sales", "inventory"].includes(id),
              )
              .map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={page === id ? "active" : ""}
                  onClick={() => navigate(id)}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              ))}
            <button onClick={() => setMobileMenu(true)}>
              <Menu size={20} />
              <span>Thêm</span>
            </button>
          </nav>
        </div>
        {dialog && (
          <Dialogs
            key={
              dialog.kind + String((dialog.value as { id?: string })?.id || "")
            }
            kind={dialog.kind}
            value={dialog.value}
            close={() => setDialog(null)}
          />
        )}{" "}
        {toast && (
          <div className={`toast ${toast.error ? "error" : ""}`} role="status">
            {toast.error ? <CloudOff size={20} /> : <CheckCircle2 size={20} />}
            <span>{toast.message}</span>
            <button
              className="icon-btn"
              aria-label="Đóng thông báo"
              onClick={() => setToast(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </AppContext>
  );
}

function Login({
  demo,
  onSuccess,
  noStore,
  error,
}: {
  demo: () => void;
  onSuccess: () => Promise<void>;
  noStore: boolean;
  error: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(error),
    [reset, setReset] = useState(false);
  return (
    <div className="login-layout">
      <div className="login-story">
        <a className="brand" href="#">
          <img src="/icon.svg" alt="" />
          <strong>MobiDesk</strong>
        </a>
        <div>
          <span className="eyebrow">GỌN HƠN MỖI NGÀY</span>
          <h1>
            Hiểu cửa hàng.
            <br />
            Bán hàng thảnh thơi.
          </h1>
          <p>
            Từ từng chiếc điện thoại đến từng món phụ kiện.
            <br />
            Quản lý rõ ràng, để bạn tập trung vào khách hàng.
          </p>
          <div className="login-features">
            <span>
              <CheckCircle2 size={17} />
              IMEI & Serial chính xác
            </span>
            <span>
              <CheckCircle2 size={17} />
              Giá vốn & công nợ rõ ràng
            </span>
            <span>
              <CheckCircle2 size={17} />
              Một quầy bán offline
            </span>
          </div>
        </div>
        <small>
          Phần mềm quản lý dành cho cửa hàng điện thoại và phụ kiện.
        </small>
      </div>
      <div className="login-form">
        <div>
          <span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span>
          <h2>
            {noStore
              ? "Thiết lập cửa hàng đầu tiên"
              : reset
                ? "Khôi phục mật khẩu"
                : "Đăng nhập cửa hàng"}
          </h2>
          <p>
            {noStore
              ? "Tài khoản đã đăng nhập, chưa có quyền tại cửa hàng."
              : "Dữ liệu riêng tư của bạn được quản lý trên Supabase."}
          </p>
          {message && <div className="notice amber">{message}</div>}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const f = new FormData(e.currentTarget);
              try {
                if (!supabase)
                  throw new Error(
                    "Chưa cấu hình Supabase. Có thể trải nghiệm bằng dữ liệu minh họa bên dưới.",
                  );
                if (noStore) {
                  await bootstrap(String(f.get("name")));
                  await onSuccess();
                } else if (reset) {
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    String(f.get("email")),
                    { redirectTo: location.origin },
                  );
                  if (error) throw error;
                  setMessage(
                    "Nếu địa chỉ hợp lệ, email khôi phục đã được gửi.",
                  );
                } else {
                  const { error } = await supabase.auth.signInWithPassword({
                    email: String(f.get("email")),
                    password: String(f.get("password")),
                  });
                  if (error) throw error;
                  await onSuccess();
                }
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {noStore ? (
              <Field label="Tên cửa hàng">
                <input
                  name="name"
                  required
                  placeholder="Cửa hàng điện thoại của bạn"
                />
              </Field>
            ) : (
              <>
                <Field label="Email">
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="ban@cuahang.vn"
                  />
                </Field>
                {!reset && (
                  <Field label="Mật khẩu">
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      required
                      placeholder="Nhập mật khẩu của bạn"
                    />
                  </Field>
                )}
              </>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? "Đang xử lý…"
                : noStore
                  ? "Tạo cửa hàng"
                  : reset
                    ? "Gửi email khôi phục"
                    : "Đăng nhập"}
              <ArrowRight size={17} />
            </Button>
          </form>
          {!noStore && (
            <button className="text-btn" onClick={() => setReset(!reset)}>
              {reset ? "Quay lại đăng nhập" : "Quên mật khẩu?"}
            </button>
          )}
          <div className="login-demo">
            <span>Muốn xem trước cách ứng dụng hoạt động?</span>
            <Button variant="secondary" onClick={demo}>
              Trải nghiệm với dữ liệu minh họa
            </Button>
          </div>
          <small>
            Để tạo tài khoản, chủ cửa hàng mời người dùng qua Supabase
            Authentication.
          </small>
          <a className="text-btn" href="#guide">
            <BookOpen size={16} />
            Đọc hướng dẫn sử dụng
          </a>
        </div>
      </div>
    </div>
  );
}
