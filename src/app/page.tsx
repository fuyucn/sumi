import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Lazy import to avoid evaluating env at build time.
  const { getCurrentUser } = await import("@/lib/current-user");
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
