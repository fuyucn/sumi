import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

// This page reads session state per-request; opt out of static prerendering.
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto" }}>
      <h1>Sumi 墨</h1>
      {user ? (
        <p>Signed in as {user.name}.</p>
      ) : (
        <p><Link href="/sign-in">Sign in with GitHub</Link>.</p>
      )}
    </main>
  );
}
