import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Per-file: // @vitest-environment happy-dom
    environmentMatchGlobs: [
      ["tests/browser-*.test.ts", "happy-dom"],
      ["tests/room-nav.test.ts", "happy-dom"],
    ],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
