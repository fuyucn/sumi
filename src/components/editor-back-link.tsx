import Link from "next/link";

/** Shared "back to dashboard" link for editor pages; mirrors the article page
 *  back-link language with a hover-sliding arrow. */
export function EditorBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group/back link-underline mb-5 inline-flex w-fit text-sm font-medium text-ink-faint transition-colors hover:text-ink"
    >
      <span
        aria-hidden
        className="inline-block transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover/back:-translate-x-0.5"
      >
        ←
      </span>{" "}
      {label}
    </Link>
  );
}
