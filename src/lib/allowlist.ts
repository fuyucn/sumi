import { APIError } from "better-auth/api";

/** True if `login` is in the comma-separated allowlist. Empty list => deny all. */
export function isAllowedGithubUser(login: string, allowlist: string): boolean {
  const allowed = allowlist
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(login.trim().toLowerCase());
}

/**
 * Request-level variant used by `getCurrentUser`: re-checks the allowlist on
 * every request so removing a GitHub login from `ALLOWED_GITHUB_USERS` revokes
 * an existing session immediately (sign-in hooks only gate new sessions).
 * Missing/blank `username` is treated as denied.
 */
export function isSessionUserAllowed(
  user: { username?: string | null } | null | undefined,
  allowlist: string,
): boolean {
  if (!user) return false;
  return isAllowedGithubUser(user.username ?? "", allowlist);
}

/**
 * Throws a Better Auth FORBIDDEN error unless `login` is on the allowlist.
 * Shared by the user-create and session-create hooks so the gate fires on
 * every sign-in, not just at account creation (immediate revocation).
 */
export function assertAllowedGithubUser(login: string, allowlist: string): void {
  if (!isAllowedGithubUser(login, allowlist)) {
    throw new APIError("FORBIDDEN", {
      message: "This GitHub account is not on the allowlist.",
    });
  }
}
