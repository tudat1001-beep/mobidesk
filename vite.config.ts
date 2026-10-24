import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { sourcemap: false, target: "es2022" },
  test: { testTimeout: 30000, fileParallelism: false },
});
