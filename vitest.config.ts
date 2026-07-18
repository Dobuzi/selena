import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    // Per-file: // @vitest-environment happy-dom
    environmentMatchGlobs: [
      ["tests/browser-*.test.ts", "happy-dom"],
      ["tests/room-nav.test.ts", "happy-dom"],
      ["tests/use-room-session.test.tsx", "happy-dom"],
    ],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
