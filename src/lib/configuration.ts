export interface InstallationConfig {
  customer: string;
  url: string;
  publishableKey: string;
}
const configKey = "mobidesk-installation-v1";
export async function hasUnsyncedLocal(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("mobidesk-v1", 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("records"))
        r.result.createObjectStore("records");
    };
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const db = r.result,
        t = db.transaction("records", "readonly"),
        store = t.objectStore("records"),
        keys = store.getAllKeys(),
        values = store.getAll();
      t.oncomplete = () => {
        const blocked = keys.result.some((key, i) => {
          const k = String(key),
            v = values.result[i];
          return (
            (k === "offline-context" && !!v) ||
            (k.startsWith("pending:live:") && !!v) ||
            (k.startsWith("outbox:live:") &&
              Array.isArray(v) &&
              v.some((r) => r.status !== "POSTED"))
          );
        });
        db.close();
        resolve(blocked);
      };
      t.onerror = () => {
        db.close();
        reject(t.error);
      };
    };
  });
}
async function accept(
  config: InstallationConfig,
  source: "environment" | "deployment",
) {
  const old = cached();
  if (old && old.url !== config.url && (await hasUnsyncedLocal()))
    return {
      config: old,
      source: "blocked" as const,
      warning:
        "Bản cài đang đổi Supabase nhưng máy còn quyền/phiếu chưa đối soát. Tiếp tục giữ project cũ; đóng quầy, xuất bản sao và xác minh giao dịch trước khi chuyển.",
    };
  localStorage.setItem(configKey, JSON.stringify(config));
  return { config, source, warning: "" };
}
export function validateConfig(value: InstallationConfig): InstallationConfig {
  const customer = value.customer.trim(),
    url = value.url.trim().replace(/\/+$/, ""),
    key = value.publishableKey.trim();
  if (!customer) throw new Error("Nhập tên khách hàng / bản cài.");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))
    throw new Error(
      "Dùng Project URL HTTPS dạng https://mã-project.supabase.co.",
    );
  if (key.startsWith("sb_secret_"))
    throw new Error("Không được dùng secret / service_role key trên ứng dụng.");
  if (!key.startsWith("sb_publishable_")) {
    try {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon") throw new Error();
    } catch {
      throw new Error(
        "Chỉ nhập publishable key hoặc legacy anon key, không dùng khóa đặc quyền.",
      );
    }
  }
  return { customer, url, publishableKey: key };
}
function cached() {
  try {
    const v = localStorage.getItem(configKey);
    return v ? validateConfig(JSON.parse(v)) : null;
  } catch {
    return null;
  }
}
async function load() {
  const url = import.meta.env.VITE_SUPABASE_URL,
    key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const config = validateConfig({
      customer: "Cửa hàng",
      url,
      publishableKey: key,
    });
    return accept(config, "environment");
  }
  if (navigator.onLine) {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}deployment.json`, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (r.ok) {
        const config = validateConfig(await r.json());
        return accept(config, "deployment");
      }
    } catch {
      /* An installation without a deployment file opens the clearly labeled demonstration. */
    }
  }
  return { config: cached(), source: "device" as const, warning: "" };
}
export const installation = await load();
export const projectNamespace =
  installation.config?.url
    .replace("https://", "")
    .replace(".supabase.co", "") || "unconfigured";
export function saveDeviceConfig(config: InstallationConfig) {
  localStorage.setItem(configKey, JSON.stringify(validateConfig(config)));
}
export function exportInstallation(config: InstallationConfig) {
  const validated = validateConfig(config),
    url = URL.createObjectURL(
      new Blob([JSON.stringify(validated, null, 2)], {
        type: "application/json",
      }),
    );
  const a = document.createElement("a");
  a.href = url;
  a.download = "deployment.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function checkInstallation(config: InstallationConfig) {
  const c = validateConfig(config);
  const r = await fetch(`${c.url}/rest/v1/rpc/app_health`, {
    method: "POST",
    headers: { apikey: c.publishableKey, "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok)
    throw new Error(
      "Chưa kết nối được hoặc chưa chạy SQL khởi tạo. Kiểm tra URL, khóa công khai và migration.",
    );
  const v = await r.json();
  if (v !== "mobidesk-1")
    throw new Error("Project chưa có schema MobiDesk tương thích.");
  return "Đã kết nối project và xác nhận schema MobiDesk.";
}
async function derive(password: string, salt: string) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 250000,
    },
    base,
    256,
  );
  return [...new Uint8Array(bits)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export const hasSetupLock = () => !!localStorage.getItem("mobidesk-setup-lock");
export async function unlockSetup(password: string) {
  const raw = localStorage.getItem("mobidesk-setup-lock");
  if (!raw) {
    if (password.length < 8)
      throw new Error("Mã thiết lập cần ít nhất 8 ký tự.");
    const salt = crypto.randomUUID(),
      hash = await derive(password, salt);
    localStorage.setItem("mobidesk-setup-lock", JSON.stringify({ salt, hash }));
    return true;
  }
  const { salt, hash } = JSON.parse(raw);
  if ((await derive(password, salt)) !== hash)
    throw new Error("Mã thiết lập không đúng.");
  return true;
}
