import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "./db";
import { env } from "./env";
import { schema } from "@/db/schema";
import { isAllowedGithubUser } from "./allowlist";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    // camelCase defaults to false → adapter uses snake_case column names,
    // which matches our Drizzle schema (e.g. "email_verified", "user_id").
    // No override needed.
  }),
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      // `repo` scope is needed to commit articles/images to the content repo
      // (GitHub-API content store, Plan 2). It grants private-repo write — keep
      // only while that feature is in scope; narrow to `public_repo` if deferred.
      scope: ["repo", "read:user"],
      /**
       * Capture the GitHub login (username) into the `username` field.
       * `profile.name` is the display name and may differ from the login;
       * `profile.login` is the canonical GitHub username we gate on.
       */
      mapProfileToUser: (profile) => ({
        username: profile.login,
      }),
    },
  },
  // NOTE: the allowlist gate fires only at account creation. A user removed
  // from ALLOWED_GITHUB_USERS after their account row exists can still sign in.
  // For v0 (small trusted allowlist) this is acceptable; revisit with a sign-in
  // check if immediate revocation is needed.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // `username` was set by mapProfileToUser above and carries profile.login.
          const raw = (user as Record<string, unknown>)["username"];
          const login = typeof raw === "string" ? raw : "";
          if (!isAllowedGithubUser(login, env.ALLOWED_GITHUB_USERS)) {
            throw new APIError("FORBIDDEN", {
              message: "This GitHub account is not on the allowlist.",
            });
          }
          return { data: user };
        },
      },
    },
  },
});
