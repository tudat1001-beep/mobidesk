import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base:
    process.env.VITE_BASE_PATH ||
    (process.env.GITHUB_ACTIONS ? "/mobidesk/" : "/"),
  plugins: [react(), tailwindcss()],
  build: { sourcemap: false, target: "es2022" },
  test: { testTimeout: 30000, fileParallelism: false },
});
