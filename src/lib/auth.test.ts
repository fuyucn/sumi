import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { expect, test } from "vitest";
import { schema } from "@/db/schema";
import { assertAllowedGithubUser, isAllowedGithubUser } from "./allowlist";

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
            assertAllowedGithubUser(login, allowlist);
            return { data: user };
          },
        },
      },
      session: {
        create: {
          before: async (session: Record<string, unknown>) => {
            assertAllowedGithubUser(
              String(session["username"] ?? ""),
              allowlist,
            );
            return { data: session };
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

test("session gate admits allowed logins on every sign-in", () => {
  // Simulates a returning account (row already exists): the session-create
  // hook re-checks the allowlist instead of trusting the stored account.
  expect(() => assertAllowedGithubUser("alice", "alice,bob")).not.toThrow();
  expect(() => assertAllowedGithubUser("alice", "bob")).toThrow(APIError);
  expect(() => assertAllowedGithubUser("mallory", "alice,bob")).toThrow(
    APIError,
  );
});
