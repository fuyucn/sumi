import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { expect, test } from "vitest";
import { schema } from "@/db/schema";
import { isAllowedGithubUser } from "./allowlist";

function makeAuth(allowlist: string) {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const auth = betterAuth({
    secret: "x".repeat(32),
    baseURL: "http://localhost:3000",
    database: drizzleAdapter(db, { provider: "pg", schema }),
    databaseHooks: {
      user: {
        create: {
          before: async (user: Record<string, unknown>) => {
            const raw = user["username"];
            const login = typeof raw === "string" ? raw : "";
            if (!isAllowedGithubUser(login, allowlist)) {
              throw new APIError("FORBIDDEN", { message: "not allowed" });
            }
            return { data: user };
          },
        },
      },
    },
  });
  return { auth, client };
}

test("auth instance constructs over pglite", () => {
  const { auth } = makeAuth("alice");
  expect(auth).toBeDefined();
  expect(typeof auth.handler).toBe("function");
});

test("gate predicate admits allowed and rejects others", () => {
  expect(isAllowedGithubUser("alice", "alice,bob")).toBe(true);
  expect(isAllowedGithubUser("mallory", "alice,bob")).toBe(false);
});
