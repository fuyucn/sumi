import Link from "next/link";
import { notFound } from "next/navigation";
import { getReadContentStore } from "@/content";
import { getCurrentUser } from "@/lib/current-user";
import { getUserHandle } from "@/lib/user";
import { Markdown } from "@/components/markdown";
import { NoteComposer } from "@/components/note-composer";
import { DeleteNoteButton } from "@/components/delete-note-button";
import { displayName } from "@/lib/display-name";
import { Reveal } from "@/components/reveal";
import { EmptyState } from "@/components/empty-state";
import { PushPin } from "@phosphor-icons/react/dist/ssr";

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
  const authorName = displayName(handle, profile);
  const user = await getCurrentUser();
  const signedInHandle = user ? await getUserHandle(user.id) : null;
  const isOwner = signedInHandle === handle;

  return (
    <main className="max-w-2xl mx-auto px-5 pt-14 pb-24 rise">
      <Link
        href={`/@${handle}`}
        className="group/back link-underline text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <span
          aria-hidden
          className="inline-block transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover/back:-translate-x-0.5"
        >
          ←
        </span>{" "}
        {authorName}
      </Link>
      <header className="mt-6 mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seal">
          Fleeting
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
          Notes
        </h1>
        <p className="mt-2 text-sm text-ink-muted tabular-nums">
          {notes.length} {notes.length === 1 ? "note" : "notes"} jotted between
          posts.
        </p>
      </header>

      {isOwner ? (
        <div className="mb-2">
          <NoteComposer handle={handle} />
        </div>
      ) : null}

      {notes.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<PushPin size={20} weight="duotone" />}
          title="No notes yet."
          hint={isOwner ? "Pin your first thought above." : undefined}
        />
      ) : (
        <ol className="mt-8 divide-y divide-line border-t border-line">
          {notes.map((note, i) => (
            <Reveal
              as="li"
              key={note.id}
              delay={Math.min(i * 0.05, 0.3)}
              className="group -mx-4 rounded-xl border-l-2 border-transparent px-4 py-6 transition-[background-color,border-color] duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-seal/60 hover:bg-paper-soft/60"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-seal/60 transition-colors duration-[var(--dur-short)] group-hover:bg-seal"
                />
                <time
                  dateTime={note.date}
                  className="text-xs text-ink-faint tabular-nums"
                >
                  {formatDate(note.date)}
                </time>
              </div>
              <div className="prose prose-sm prose-neutral max-w-none mt-2 font-serif text-lg leading-relaxed text-ink">
                <Markdown>{note.body}</Markdown>
              </div>
              {isOwner ? (
                <div className="mt-2">
                  <DeleteNoteButton id={note.id} />
                </div>
              ) : null}
            </Reveal>
          ))}
        </ol>
      )}
    </main>
  );
}
