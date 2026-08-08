import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { env } from "./env";
import { schema } from "@/db/schema";
import { getUserHandle } from "./user";
import { assertAllowedGithubUser } from "./allowlist";
import { clientIpFromRequest, logSecurityEvent } from "./security-log";

/** Client IP headers trusted in order of preference (Cloudflare → proxy → Docker). */
const IP_HEADERS = ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"];

/**
 * Run the allowlist gate and emit an audit line when it rejects. Context is
 * `null` outside real requests (tests), so the IP/path fields are optional.
 */
function gateLogin(
  login: string,
  allowlist: string,
  ctx: { request?: Request | null; path?: string | null } | null,
): void {
  try {
    assertAllowedGithubUser(login, allowlist);
  } catch (e) {
    logSecurityEvent({
      event: "login-denied",
      login,
      ip: clientIpFromRequest(ctx?.request ?? null),
      path: ctx?.path ?? null,
    });
    throw e;
  }
}

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
    // Built-in per-IP rate limiting (in-memory is fine for the single-instance
    // Docker/VPS deploy; Cloudflare adds its own edge limits on top). Better
    // Auth already gives /sign-in* a strict 3 req / 10 s rule; we add tighter
    // caps on the OAuth callback and sign-out so the login surface can't be
    // hammered. Keep `enabled: true` so local Docker gets the same protection.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      storage: "memory",
      customRules: {
        "/callback/github": { window: 60, max: 10 },
        "/sign-out": { window: 60, max: 30 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            // `username` was set by mapProfileToUser above and carries profile.login.
            const raw = (user as Record<string, unknown>)["username"];
            const login = typeof raw === "string" ? raw : "";
            gateLogin(login, env.ALLOWED_GITHUB_USERS, ctx);
            return { data: user };
          },
        },
      },
      session: {
        create: {
          // Re-check the allowlist on every sign-in so removing a user from
          // ALLOWED_GITHUB_USERS revokes their access immediately, even when
          // their account row already exists (previously the gate only fired
          // at account creation).
          before: async (session, ctx) => {
            const login = await getUserHandle(session.userId);
            gateLogin(login ?? "", env.ALLOWED_GITHUB_USERS, ctx);
            return { data: session };
          },
        },
      },
    },
    advanced: {
      // Trusted proxy chain: Cloudflare first, then common reverse proxies.
      // In plain Docker (no proxy) better-auth falls back to the socket IP.
      ipAddress: {
        ipAddressHeaders: IP_HEADERS,
      },
      // Secure cookies only over HTTPS (production / Cloudflare / VPS behind
      // TLS); plain HTTP (local Docker) keeps cookies unsecured so sign-in works.
      useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
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
