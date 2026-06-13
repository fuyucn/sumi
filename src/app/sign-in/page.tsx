"use client";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", textAlign: "center" }}>
      <h1>Sign in to Sumi</h1>
      <button onClick={() => signIn.social({ provider: "github", callbackURL: "/" })}>
        Continue with GitHub
      </button>
    </main>
  );
}
