import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["scripts/**/*.test.ts"],
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      GITHUB_CONTENT_REPO: process.env.GITHUB_CONTENT_REPO ?? "",
    },
  },
});