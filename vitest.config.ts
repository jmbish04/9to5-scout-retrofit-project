import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "wrangler.toml",
      ],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": "/Volumes/Projects/workers/9to5-scout/src",
    },
  },
});
