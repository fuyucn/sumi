import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { PostForm } from "@/components/post-form";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return (
    <main style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>New post</h1>
      <PostForm />
    </main>
  );
}
