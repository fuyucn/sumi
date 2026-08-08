import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { isSessionUserAllowed } from "@/lib/allowlist";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user ?? null;
  // Request-level safety valve: re-check the allowlist on every request so
  // removing a GitHub login from ALLOWED_GITHUB_USERS revokes their existing
  // session immediately, not just at the next sign-in.
  if (!isSessionUserAllowed(user, env.ALLOWED_GITHUB_USERS)) return null;
  return user;
}
