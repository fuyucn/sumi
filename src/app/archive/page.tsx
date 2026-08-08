import { redirect } from "next/navigation";

/** Old route kept for bookmarks/backlinks — the posts list now lives at /posts. */
export default function ArchiveRedirect() {
  redirect("/posts");
}
