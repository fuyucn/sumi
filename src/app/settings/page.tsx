import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getAiStore, getContentStoreForUser } from "@/content";
import { ProfileForm } from "@/components/profile-form";
import { AiProviderForm } from "@/components/ai-provider-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const handle = await getUserHandle(user.id);
  if (!handle) redirect("/sign-in");
  const store = await getContentStoreForUser(user.id);
  const profile = (await store?.getProfile(handle)) ?? {};
  const aiStore = await getAiStore();
  const provider = aiStore ? await aiStore.getProvider(handle) : null;

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
        Settings
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        <Link
          href={`/@${handle}`}
          className="link-underline text-ink-muted transition-colors hover:text-ink"
        >
          @{handle}
        </Link>
      </p>
      <div className="mt-10">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
          Profile
        </h2>
        <div className="mt-5">
          <ProfileForm initial={profile} />
        </div>
      </div>
      <div className="mt-12">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
          AI 导读
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          配置一个 OpenAI 兼容的 chat/completions 服务（OpenAI、DeepSeek、Moonshot、Ollama 等）。
          在文章编辑页点「一键生成 AI 导读」手动生成，不满意可随时重新生成；未启用或未配置时该功能自动隐藏。
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
      </div>
    </main>
  );
}
