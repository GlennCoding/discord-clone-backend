import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
