import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "./db";
import { env } from "./env";
import { schema } from "@/db/schema";
import { isAllowedGithubUser } from "./allowlist";

function buildAuth() {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    // `username` (the GitHub login, set via mapProfileToUser) is a custom field;
    // it must be declared here or Better Auth won't persist it to the column.
    // input:false → it's set server-side from the OAuth profile, not user input.
    user: {
      additionalFields: {
        username: { type: "string", required: false, input: false },
      },
    },
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
}

// Lazy singleton: `env` (and all secrets) is NOT accessed at module load —
// only on the first property access of `auth` (i.e. the first request).
type AuthInstance = ReturnType<typeof buildAuth>;
let _auth: AuthInstance | undefined;
export const auth = new Proxy({} as AuthInstance, {
  get(_t, prop) {
    if (!_auth) _auth = buildAuth();
    return _auth[prop as keyof AuthInstance];
  },
  // `has` must reflect the real instance: better-auth's toNextJsHandler uses
  // `"handler" in auth` to detect the instance, and the get-only proxy would
  // otherwise report false and mistake `auth` for the handler function.
  has(_t, prop) {
    if (!_auth) _auth = buildAuth();
    return prop in _auth;
  },
});
