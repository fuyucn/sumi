import Link from "next/link";

/** Shared "back to dashboard" link for editor pages; mirrors the article page
 *  back-link language with a hover-sliding arrow. */
export function EditorBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group mb-5 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-faint transition-colors hover:text-seal"
    >
      <span
        aria-hidden
        className="transition-transform duration-200 ease-out group-hover:-translate-x-0.5"
      >
        ←
      </span>
      {label}
    </Link>
  );
}
