import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
    },
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.transaction.test.ts"],
          setupFiles: ["./src/__tests__/setup/mongoSetup.ts"],
          testTimeout: 60000,
          hookTimeout: 60000,
        },
      },
      {
        test: {
          name: "transactions",
          environment: "node",
          globals: true,
          include: ["src/**/*.transaction.test.ts"],
          setupFiles: ["./src/__tests__/setup/mongoReplicaSetSetup.ts"],
          testTimeout: 60000,
          hookTimeout: 60000,
        },
      },
    ],
  },
});
