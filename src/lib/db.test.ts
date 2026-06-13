import { expect, test } from "vitest";
import { createDb } from "./db";

test("createDb opens an in-memory db and runs a query", () => {
  const db = createDb(":memory:");
  db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
  db.prepare("INSERT INTO t (v) VALUES (?)").run("hi");
  const row = db.prepare("SELECT v FROM t WHERE id = 1").get() as { v: string };
  expect(row.v).toBe("hi");
  db.close();
});
