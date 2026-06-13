import { expect, test } from "vitest";
import { createDb } from "./db";

test("createDb returns a drizzle client without connecting", () => {
  const db = createDb("postgresql://user:pass@localhost/sumi_test");
  expect(typeof db.select).toBe("function");
});
