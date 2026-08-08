"use client";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { SignOut } from "@phosphor-icons/react";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      className="press inline-flex items-center gap-2 rounded-full border border-line-strong px-3.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-seal hover:text-seal"
    >
      <SignOut size={14} weight="duotone" aria-hidden />
      退出登录
    </button>
  );
}
