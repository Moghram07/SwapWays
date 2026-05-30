import path from "node:path";
import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // `tests/` is the Playwright e2e suite (own runner) — keep it out of the Vitest unit run.
    exclude: [...configDefaults.exclude, "tests/**", "test-results/**"],
  },
});
