import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { env } from "@/lib/env";
import { getAiStore, getContentStoreForUser } from "@/content";
import { ProfileForm } from "@/components/profile-form";
import { AiProviderForm } from "@/components/ai-provider-form";
import { SignOutButton } from "@/components/sign-out-button";
import { PageTransition } from "@/components/page-transition";
import { Reveal } from "@/components/reveal";
import { displayName } from "@/lib/display-name";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const handle = await getUserHandle(user.id);
  if (!handle) redirect("/sign-in");
  const store = await getContentStoreForUser(user.id);
  const profile = (await store?.getProfile(handle)) ?? {};
  const authorName = displayName(handle, profile);
  const aiStore = await getAiStore();
  const provider = aiStore ? await aiStore.getProvider(handle) : null;
  const allowlist = env.ALLOWED_GITHUB_USERS
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAllowed = allowlist.includes(handle.toLowerCase());

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-5 pt-14 pb-24">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">
        Configure
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
        Settings
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        <Link
          href={`/@${handle}`}
          className="link-underline text-ink-muted transition-colors hover:text-ink"
        >
          {authorName}
        </Link>
      </p>
      <div className="mt-10 space-y-6">
        <Reveal as="section" className="rounded-card border border-line bg-paper/60 p-5 shadow-card sm:p-6">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
            Profile
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            对外显示的名称与一句简介；名称留空时显示为 @{handle}。
          </p>
          <div className="mt-5">
            <ProfileForm initial={profile} handle={handle} />
          </div>
        </Reveal>

        <Reveal as="section" delay={0.06} className="rounded-card border border-line bg-paper/60 p-5 shadow-card sm:p-6">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
            AI 总结
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            配置一个 OpenAI 兼容的 chat/completions 服务（OpenAI、DeepSeek、Moonshot、Ollama 等）。
            在文章编辑页点「一键生成 AI 总结」手动生成，不满意可随时重新生成；
            导读留空时 TL;DR 会自动回填为文章导读（列表预览与 SEO 描述），手写导读优先，不会被覆盖。未启用或未配置时该功能自动隐藏。
          </p>
          <div className="mt-5">
            {provider ? (
              <AiProviderForm
                initial={{
                  baseUrl: provider.baseUrl,
                  model: provider.model,
                  enabled: provider.enabled,
                  hasKey: provider.apiKey.length > 0,
                }}
              />
            ) : (
              <AiProviderForm
                initial={{ baseUrl: "https://opencode.ai/zen/go/v1", model: "glm-5.1", enabled: true, hasKey: false }}
              />
            )}
          </div>
        </Reveal>

        <Reveal as="section" delay={0.12} className="rounded-card border border-line bg-paper/60 p-5 shadow-card sm:p-6">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
            登录与安全
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            只允许出现在 `ALLOWED_GITHUB_USERS` 白名单里的 GitHub 账号登录；
            每次登录和每个请求都会重新校验，移除账号后会话立即失效。
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper/40 px-4 py-3">
              <dt className="text-ink-faint">当前账号</dt>
              <dd className="font-medium text-ink">@{handle}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper/40 px-4 py-3">
              <dt className="text-ink-faint">登录白名单</dt>
              <dd className="font-medium text-ink">
                {allowlist.length > 0 ? (
                  allowlist.map((u) => `@${u}`).join("、")
                ) : (
                  <span className="text-seal">未配置（拒绝所有人）</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper/40 px-4 py-3">
              <dt className="text-ink-faint">当前账号状态</dt>
              <dd>
                {isAllowed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-seal/30 bg-seal/[0.06] px-2.5 py-0.5 text-xs font-medium tracking-wide text-seal">
                    在白名单内
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-seal/40 bg-seal/10 px-2.5 py-0.5 text-xs font-medium tracking-wide text-seal">
                    不在白名单（将被拒绝）
                  </span>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
            <SignOutButton />
            <p className="text-xs text-ink-faint">GitHub 登录仅用于身份验证，内容全部存在自己的数据库里。</p>
          </div>
        </Reveal>
      </div>
      </main>
    </PageTransition>
  );
}
