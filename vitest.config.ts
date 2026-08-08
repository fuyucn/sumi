import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    env: {
      DATABASE_URL: "postgresql://user:pass@localhost/sumi_test",
      BETTER_AUTH_SECRET: "x".repeat(32),
      BETTER_AUTH_URL: "http://localhost:3000",
      GITHUB_CLIENT_ID: "test-cid",
      GITHUB_CLIENT_SECRET: "test-csecret",
      ALLOWED_GITHUB_USERS: "alice,bob",
    },
  },
});
