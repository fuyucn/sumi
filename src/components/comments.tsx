import { getReadContentStore } from "@/content";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { Markdown } from "@/components/markdown";
import Link from "next/link";
import { CommentForm } from "@/components/comment-form";
import { ReplyComposer } from "@/components/reply-composer";
import { DeleteCommentButton } from "@/components/delete-comment-button";
import { replyAllowed } from "@/lib/comment-depth";
import { AuthorName } from "@/components/author-name";
import type { Comment } from "@/content/types";

function indexByParent(comments: Comment[]): Map<string | null, Comment[]> {
  const map = new Map<string | null, Comment[]>();
  for (const c of comments) {
    const key = c.parentId && comments.some((o) => o.id === c.parentId) ? c.parentId : null;
    const list = map.get(key) ?? [];
    list.push(c);
    map.set(key, list);
  }
  return map;
}

function CommentNode({
  comment,
  replies,
  allComments,
  postHandle,
  slug,
  signedInHandle,
}: {
  comment: Comment;
  replies: Comment[];
  allComments: Comment[];
  postHandle: string;
  slug: string;
  signedInHandle: string | null;
}) {
  return (
    <li>
      <div className="py-5 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="link-underline font-medium text-ink-muted transition-colors hover:text-ink">
            <AuthorName handle={comment.handle} />
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
        {signedInHandle && (comment.handle === signedInHandle || postHandle === signedInHandle) ? (
          <div className="mt-1.5">
            <DeleteCommentButton postHandle={postHandle} slug={slug} commentId={comment.id} />
          </div>
        ) : null}
        {signedInHandle && replyAllowed(allComments, comment) ? (
          <ReplyComposer
            postHandle={postHandle}
            slug={slug}
            authorHandle={signedInHandle}
            parentId={comment.id}
          />
        ) : null}
      </div>
      {replies.length > 0 ? (
        <ul className="ml-4 space-y-1 border-l-2 border-line pl-5 sm:ml-6">
          {replies.map((child) => (
            <CommentNode
              key={child.id}
              comment={child}
              replies={indexByParent(replies).get(child.id) ?? []}
              allComments={allComments}
              postHandle={postHandle}
              slug={slug}
              signedInHandle={signedInHandle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export async function Comments({ handle, slug }: { handle: string; slug: string }) {
  const comments = (await (await getReadContentStore())?.listComments(handle, slug)) ?? [];
  const user = await getCurrentUser();
  const signedInHandle = user ? await getUserHandle(user.id) : null;

  const byParent = indexByParent(comments);
  const roots = byParent.get(null) ?? [];

  return (
    <section className="mt-16 border-t border-line pt-8">
      <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">Comments</h2>
      {comments.length > 0 ? (
        <ul className="mt-6 divide-y divide-line">
          {roots.map((root) => (
            <CommentNode
              key={root.id}
              comment={root}
              replies={byParent.get(root.id) ?? []}
              allComments={comments}
              postHandle={handle}
              slug={slug}
              signedInHandle={signedInHandle}
            />
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
