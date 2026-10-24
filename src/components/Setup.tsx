import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  KeyRound,
  LockKeyhole,
  Plug,
  Save,
} from "lucide-react";
import {
  installation,
  validateConfig,
  saveDeviceConfig,
  exportInstallation,
  checkInstallation,
  unlockSetup,
  hasSetupLock,
  hasUnsyncedLocal,
} from "../lib/configuration";
import { getLocal } from "../lib/storage";
import { Button, Field } from "./ui";
export default function Setup() {
  const [unlocked, setUnlocked] = useState(false),
    [password, setPassword] = useState(""),
    [config, setConfig] = useState(
      installation.config || { customer: "", url: "", publishableKey: "" },
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const lockedSource =
    installation.source === "deployment" ||
    installation.source === "environment";
  async function action(kind: "check" | "save" | "export") {
    setBusy(true);
    setMessage("");
    try {
      const c = validateConfig(config);
      if (kind === "check") setMessage(await checkInstallation(c));
      else if (kind === "export") {
        exportInstallation(c);
        setMessage(
          "Đã xuất deployment.json. Đưa tệp vào thư mục public của đúng bản cài rồi build/phát hành để áp dụng cho mọi thiết bị.",
        );
      } else {
        if (await hasUnsyncedLocal())
          throw new Error(
            "Còn cấu hình quầy offline. Đóng phiên/đồng bộ và xuất bản sao trước khi đổi project.",
          );
        saveDeviceConfig(c);
        setMessage("Đã lưu cấu hình trên thiết bị này. Đang mở lại ứng dụng…");
        location.href = location.origin + "/#dashboard";
        location.reload();
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="setup-page">
      <a className="brand" href="#dashboard">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
        <strong>MobiDesk</strong>
      </a>
      <section className="panel setup-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">THIẾT LẬP BẢN CÀI</span>
            <h2>Cấu hình riêng cho khách hàng</h2>
            <p>
              Mỗi bản cài trỏ tới một Supabase project. Mục này không nằm trong
              menu nhân viên.
            </p>
          </div>
          <LockKeyhole size={25} className="green-text" />
        </div>
        {!unlocked ? (
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              void unlockSetup(password)
                .then(() => setUnlocked(true))
                .catch((e) => setMessage(e.message))
                .finally(() => setBusy(false));
            }}
          >
            <Field
              label={
                hasSetupLock()
                  ? "Mã khóa thiết lập trên thiết bị này"
                  : "Tạo mã khóa thiết lập cho thiết bị này"
              }
            >
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={
                  hasSetupLock() ? "current-password" : "new-password"
                }
              />
              <small>
                Mã này khóa giao diện cấu hình trên trình duyệt hiện tại; không
                thay thế Supabase Auth/RLS hay quyền quản trị hosting. Người có
                quyền sửa dữ liệu trình duyệt có thể gỡ khóa.
              </small>
            </Field>
            <Button type="submit" disabled={busy}>
              <KeyRound size={16} />
              Mở thiết lập
            </Button>
            {message && <div className="notice amber">{message}</div>}
          </form>
        ) : (
          <div className="settings-form">
            <Field label="Tên khách hàng / bản cài">
              <input
                value={config.customer}
                onChange={(e) =>
                  setConfig({ ...config, customer: e.target.value })
                }
                placeholder="VD: Cửa hàng Minh Phát"
              />
            </Field>
            <Field label="Supabase Project URL">
              <input
                type="url"
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://xxxxxxxx.supabase.co"
              />
            </Field>
            <Field label="Publishable key hoặc legacy anon key">
              <textarea
                value={config.publishableKey}
                onChange={(e) =>
                  setConfig({ ...config, publishableKey: e.target.value })
                }
                placeholder="sb_publishable_…"
                spellCheck={false}
              />
              <small>
                Không nhập email/mật khẩu tài khoản Supabase, database password,
                secret key hoặc service_role key.
              </small>
            </Field>
            <div className="notice neutral">
              {lockedSource
                ? "Bản cài đang lấy cấu hình dùng chung từ hosting. Lưu trên máy không ghi đè cấu hình đó; hãy xuất tệp và phát hành lại đúng bản cài."
                : "Lưu trên thiết bị để thử kết nối. Muốn cùng khách dùng trên nhiều thiết bị, xuất deployment.json và phát hành tệp đó cùng bản cài."}
            </div>
            <div className="setup-actions">
              <Button
                variant="secondary"
                onClick={() => void action("check")}
                disabled={busy}
              >
                <Plug size={16} />
                Kiểm tra kết nối
              </Button>
              <Button
                variant="secondary"
                onClick={() => void action("export")}
                disabled={busy}
              >
                <Download size={16} />
                Xuất cấu hình bản cài
              </Button>
              <Button
                onClick={() => void action("save")}
                disabled={busy || lockedSource}
              >
                <Save size={16} />
                Lưu trên máy & mở ứng dụng
              </Button>
            </div>
            <div className="notice neutral">
              Project mới: chạy bộ SQL khởi tạo bằng công cụ quản trị Supabase
              trước khi kiểm tra kết nối. Bộ SQL chỉ dành cho project trống,
              chưa chạy tự động từ trình duyệt.
            </div>
            <a
              className="text-btn"
              href={`${import.meta.env.BASE_URL}supabase-setup.sql`}
              download
            >
              <Download size={15} />
              Tải SQL khởi tạo Supabase
            </a>
            {message && <div className="notice amber">{message}</div>}
          </div>
        )}
        <div className="panel-foot">
          <a className="text-btn" href="#dashboard">
            <ArrowLeft size={15} />
            Quay lại ứng dụng
          </a>
        </div>
      </section>
    </div>
  );
}
