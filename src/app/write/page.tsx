import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { PostForm } from "@/components/post-form";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <PostForm />
    </main>
  );
}
