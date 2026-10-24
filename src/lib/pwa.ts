import { useSyncExternalStore } from "react";

let state = import.meta.env.PROD
  ? "Đang chuẩn bị bộ nhớ PWA…"
  : "Chế độ phát triển: chưa lưu PWA offline.";
const listeners = new Set<() => void>();
function update(value: string) {
  state = value;
  listeners.forEach((f) => f());
}
export function usePwaStatus() {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => state,
  );
}
export function startPwa() {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) {
    update(
      "Trình duyệt này không hỗ trợ lưu PWA offline. Dùng Chrome / Edge trên máy quầy.",
    );
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (navigator.serviceWorker.controller)
      update(
        "Bộ nhớ PWA đã sẵn sàng. Cần thử ngắt mạng và mở lại trên máy quầy trước khi vận hành.",
      );
  });
  // Register immediately: configuration uses top-level await, so window.load may already have fired.
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then(async (registration) => {
      await navigator.serviceWorker.ready;
      if (navigator.serviceWorker.controller)
        update(
          "Bộ nhớ PWA đã sẵn sàng. Cần thử ngắt mạng và mở lại trên máy quầy trước khi vận hành.",
        );
      else
        update(
          "PWA đã cài. Hãy tải lại trang khi còn mạng để kiểm tra bộ nhớ offline.",
        );
      if (registration.waiting)
        update(
          "Có bản PWA mới chờ cập nhật. Đối soát và xuất bản sao quầy trước khi đóng các tab để cập nhật.",
        );
    })
    .catch((e) => update(`Chưa chuẩn bị được PWA offline: ${e.message}`));
}
