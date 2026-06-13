import Link from "next/link";
import type { PostMeta } from "@/content/types";

export function PostCard({ handle, post }: { handle: string; post: PostMeta }) {
  return (
    <article style={{ borderBottom: "1px solid #eee", padding: "1rem 0" }}>
      <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
        <Link href={`/@${handle}/${post.slug}`}>{post.title}</Link>
      </h2>
      <p style={{ color: "#666", margin: "0.25rem 0" }}>
        <Link href={`/@${handle}`}>@{handle}</Link>
        {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
      </p>
      {post.excerpt ? <p style={{ margin: 0 }}>{post.excerpt}</p> : null}
      {post.tags.length > 0 ? (
        <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
          {post.tags.map((t) => (
            <Link key={t} href={`/tag/${t}`} style={{ marginRight: 8 }}>#{t}</Link>
          ))}
        </p>
      ) : null}
    </article>
  );
}
