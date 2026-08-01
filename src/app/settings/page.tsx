import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { getContentStoreForUser } from "@/content";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const handle = await getUserHandle(user.id);
  if (!handle) redirect("/sign-in");
  const store = await getContentStoreForUser(user.id);
  const profile = (await store?.getProfile(handle)) ?? {};

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
    </main>
  );
}
