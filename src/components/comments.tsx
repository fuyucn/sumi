import { getReadContentStore } from "@/content";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { Markdown } from "@/components/markdown";
import Link from "next/link";
import { CommentForm } from "@/components/comment-form";

export async function Comments({ handle, slug }: { handle: string; slug: string }) {
  const comments = (await (await getReadContentStore())?.listComments(handle, slug)) ?? [];
  const user = await getCurrentUser();
  const signedInHandle = user ? await getUserHandle(user.id) : null;

  return (
    <section className="mt-16 border-t border-line pt-8">
      <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">Comments</h2>
      {comments.length > 0 ? (
        <ul className="mt-6 divide-y divide-line">
          {comments.map((comment) => (
            <li key={comment.date + comment.handle} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="link-underline font-medium text-ink-muted transition-colors hover:text-ink">
                  @{comment.handle}
                </span>
                <span aria-hidden className="text-line-strong">
                  ·
                </span>
                <time dateTime={comment.date} className="text-ink-faint">
                  {new Date(comment.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              <div className="mt-2 text-sm leading-relaxed text-ink">
                <Markdown>{comment.body}</Markdown>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">No comments yet.</p>
      )}
      <div className="mt-10">
        {signedInHandle ? (
          <CommentForm postHandle={handle} slug={slug} authorHandle={signedInHandle} />
        ) : (
          <p className="text-sm text-ink-muted">
            <Link href="/sign-in" className="link-underline font-medium text-ink transition-colors hover:text-ink">
              Sign in
            </Link>{" "}
            to join the conversation.
          </p>
        )}
      </div>
    </section>
  );
}
