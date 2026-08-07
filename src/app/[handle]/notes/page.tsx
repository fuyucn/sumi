import Link from "next/link";
import { notFound } from "next/navigation";
import { getReadContentStore } from "@/content";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { Markdown } from "@/components/markdown";
import { NoteComposer } from "@/components/note-composer";
import { DeleteNoteButton } from "@/components/delete-note-button";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotesPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  const handleParam = decodeURIComponent(raw);
  if (!handleParam.startsWith("@")) notFound();
  const handle = handleParam.slice(1);

  const store = await getReadContentStore();
  if (!store) notFound();
  const notes = await store.listNotes(handle);
  const profile = await store.getProfile(handle);
  const user = await getCurrentUser();
  const signedInHandle = user ? await getUserHandle(user.id) : null;
  const isOwner = signedInHandle === handle;

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <Link
        href={`/@${handle}`}
        className="link-underline text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        @{handle}
      </Link>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink">
        Notes
      </h1>
      {profile?.displayName ? (
        <p className="mt-1 text-sm text-ink-muted">{profile.displayName} · 手记</p>
      ) : null}

      {isOwner ? (
        <div className="mt-8">
          <NoteComposer handle={handle} />
        </div>
      ) : null}

      {notes.length === 0 ? (
        <p className="mt-16 border-t border-line py-24 text-center font-serif text-lg text-ink-muted">
          {isOwner
            ? "No notes yet. Pin your first thought above."
            : "No notes yet."}
        </p>
      ) : (
        <ol className="mt-10 divide-y divide-line border-t border-line">
          {notes.map((note) => (
            <li key={note.id} className="py-6">
              <time
                dateTime={note.date}
                className="text-xs text-ink-faint tabular-nums"
              >
                {formatDate(note.date)}
              </time>
              <div className="prose prose-sm prose-neutral max-w-none mt-2 font-serif text-lg leading-relaxed text-ink">
                <Markdown>{note.body}</Markdown>
              </div>
              {isOwner ? (
                <div className="mt-2">
                  <DeleteNoteButton id={note.id} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
