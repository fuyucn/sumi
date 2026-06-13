/** True if `login` is in the comma-separated allowlist. Empty list => deny all. */
export function isAllowedGithubUser(login: string, allowlist: string): boolean {
  const allowed = allowlist
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(login.trim().toLowerCase());
}
