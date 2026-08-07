"use client";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 py-20 rise">
      <div className="w-full max-w-sm text-center">
        <p className="font-serif text-3xl leading-none text-seal" aria-hidden>墨</p>
        <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-ink">
          Sign in to Sumi
        </h1>
        <p className="mx-auto mt-3 mb-8 max-w-xs font-serif text-[1.0625rem] leading-relaxed text-ink-muted">
          Write and publish your thoughts. Read what others have left behind.
        </p>
        <button
          onClick={() => signIn.social({ provider: "github", callbackURL: "/" })}
          className="btn-primary w-full gap-2.5 px-4 py-3"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>
        <p className="mt-5 text-xs leading-relaxed text-ink-faint">
          Your posts are committed to your own GitHub repository as Markdown.
        </p>
      </div>
    </main>
  );
}
