import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside the react-server condition; tests run in plain Node.
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    env: {
      BETTER_AUTH_SECRET: "unit-tests-only-secret-0123456789abcdef",
      MAIL_TRANSPORT: "memory",
    },
    // The demo-data tests seed an in-memory Postgres; that takes a few seconds.
    testTimeout: 60_000,
  },
});
