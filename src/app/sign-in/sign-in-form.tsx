"use client";
import { useEffect, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { CircleNotch, LockKey } from "@phosphor-icons/react";

/** Better Auth OAuth error codes → friendly Chinese explanations. */
const ERROR_HINTS: Record<string, string> = {
  forbidden: "这个 GitHub 账号不在允许登录的名单里。",
  FORBIDDEN: "这个 GitHub 账号不在允许登录的名单里。",
  access_denied: "已在 GitHub 上取消授权，没有完成登录。",
  "rate_limit_exceeded": "登录尝试过于频繁，请稍后再试。",
  invalid_state: "登录会话已过期或无效，请重新尝试。",
};

function hintFor(code: string, description: string | null): string {
  const hint = ERROR_HINTS[code] ?? ERROR_HINTS[code.toLowerCase()];
  if (hint) return hint;
  if (description && description.trim()) return description.trim();
  return "登录失败，请重试。";
}

export function SignInForm({ passphraseRequired }: { passphraseRequired: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(!passphraseRequired);

  // OAuth callback failures redirect back here with ?error=...; read it once on
  // mount (client-side only, so no SSR/hydration involvement).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code) {
      // Read the OAuth failure once after hydration; the value lives in the
      // URL, not in server-rendered markup, so a render-time read would
      // mismatch on SSR. Intentionally not derived during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(hintFor(code, params.get("error_description")));
    }
  }, []);

  // When a passphrase is configured, ask the server whether this browser is
  // already unlocked (30-day owner cookie) so returning owners skip the field.
  useEffect(() => {
    if (!passphraseRequired) return;
    let cancelled = false;
    fetch("/api/auth/passphrase", { credentials: "same-origin" })
      .then((r) => r.json() as Promise<{ unlocked: boolean }>)
      .then((d) => {
        if (!cancelled) setUnlocked(d.unlocked);
      })
      .catch(() => {
        if (!cancelled) setUnlocked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [passphraseRequired]);

  const unlock = async () => {
    if (unlocking || !passphrase.trim()) return;
    setUnlocking(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/passphrase", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setUnlocked(true);
        setPassphrase("");
      } else {
        setError(data.error ?? "解锁失败，请重试。");
      }
    } catch {
      setError("解锁失败，请重试。");
    } finally {
      setUnlocking(false);
    }
  };

  const start = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await signIn.social({ provider: "github", callbackURL: "/" });
    } catch {
      // OAuth redirects away on success; only a failure lands back here.
      setPending(false);
      setError("登录失败，请重试。");
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 py-20 rise">
      <div className="w-full max-w-sm text-center">
        <p className="group inline-flex" aria-hidden>
          <span className="seal-stamp flex h-14 w-14 items-center justify-center rounded-2xl bg-seal font-serif text-3xl font-semibold leading-none text-paper shadow-sm transition-colors group-hover:bg-seal-soft">
            墨
          </span>
        </p>
        <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-ink">
          Sign in to Sumi
        </h1>
        <p className="mx-auto mt-3 mb-8 max-w-xs font-serif text-[1.0625rem] leading-relaxed text-ink-muted">
          Write and publish your thoughts. Read what others have left behind.
        </p>

        {passphraseRequired && !unlocked ? (
          <div className="mb-6 rounded-card border border-line bg-paper/60 p-4 text-left shadow-card">
            <label
              htmlFor="login-passphrase"
              className="flex items-center gap-1.5 text-xs font-medium text-ink-muted"
            >
              <LockKey size={13} weight="duotone" aria-hidden />
              登录口令
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="login-passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void unlock();
                  }
                }}
                autoComplete="current-password"
                placeholder="输入口令解锁登录"
                className="w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-seal"
              />
              <button
                type="button"
                onClick={unlock}
                disabled={unlocking || !passphrase.trim()}
                aria-busy={unlocking}
                className="btn-primary shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {unlocking ? "…" : "解锁"}
              </button>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
              解锁后此浏览器保留 30 天，之后才需要再次输入。
            </p>
          </div>
        ) : passphraseRequired ? (
          <p className="mb-6 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
            <LockKey size={13} weight="duotone" aria-hidden />
            已解锁，本浏览器保留 30 天
          </p>
        ) : null}

        <button
          type="button"
          onClick={start}
          disabled={pending || (passphraseRequired && !unlocked)}
          aria-busy={pending}
          className="btn-primary w-full gap-2.5 px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden />
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          )}
          {pending ? "Redirecting…" : "Continue with GitHub"}
        </button>
        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-card border border-line-strong bg-paper/70 px-4 py-3 text-sm leading-relaxed text-ink-muted shadow-card"
          >
            {error}
          </p>
        ) : null}
        <p className="mt-5 text-xs leading-relaxed text-ink-faint">
          Your posts live in your own space: versioned, portable, and yours.
          <br />
          仅允许白名单内的 GitHub 账号登录，站点不对外开放注册。
        </p>
      </div>
    </main>
  );
}
