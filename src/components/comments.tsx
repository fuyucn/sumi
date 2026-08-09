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
import { EmptyState } from "@/components/empty-state";
import { ChatCircle } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
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

type CommentNodeProps = {
  comment: Comment;
  replies: Comment[];
  allComments: Comment[];
  postHandle: string;
  slug: string;
  signedInHandle: string | null;
};

function CommentContent({
  comment,
  replies,
  allComments,
  postHandle,
  slug,
  signedInHandle,
}: CommentNodeProps) {
  return (
    <>
      <div className="group -mx-3 rounded-lg border-l-2 border-transparent px-3 py-1 transition-[background-color,border-color] duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-seal/60 hover:bg-paper-deep/30">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Link
            href={`/@${comment.handle}`}
            className="link-underline font-medium text-ink-muted transition-colors duration-[var(--dur-short)] group-hover:text-seal"
          >
            <AuthorName handle={comment.handle} />
          </Link>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <time
            dateTime={comment.date}
            className="text-ink-faint transition-colors duration-[var(--dur-short)] group-hover:text-seal/80"
          >
            {new Date(comment.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>
        <div className="mt-2 text-sm leading-relaxed text-ink">
          <Markdown zoomable={false}>{comment.body}</Markdown>
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
        <ul className="ml-4 space-y-1 border-l-2 border-seal/20 pl-5 sm:ml-6">
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
    </>
  );
}

function CommentNode(props: CommentNodeProps) {
  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <CommentContent {...props} />
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
      <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
        Comments
        {comments.length > 0 ? (
          <span className="ml-2 align-middle font-sans text-sm font-normal text-ink-faint tabular-nums">
            {comments.length}
          </span>
        ) : null}
      </h2>
      {comments.length > 0 ? (
        <ul className="mt-6 divide-y divide-line">
          {roots.map((root, i) => (
            <Reveal
              key={root.id}
              as="li"
              className="py-5 first:pt-0 last:pb-0"
              delay={Math.min(i * 0.05, 0.3)}
            >
              <CommentContent
                comment={root}
                replies={byParent.get(root.id) ?? []}
                allComments={comments}
                postHandle={handle}
                slug={slug}
                signedInHandle={signedInHandle}
              />
            </Reveal>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<ChatCircle size={20} weight="duotone" />}
          title="No comments yet."
          hint="Start the conversation and leave the first mark."
        />
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
