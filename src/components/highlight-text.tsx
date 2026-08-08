/** Wraps every case-insensitive match of `query` in a paper-highlighted
 *  <mark>, escaping regex metacharacters so user input stays literal. */
export function HighlightText({
  text,
  query,
  className = "rounded-[3px] bg-seal-wash px-0.5 text-ink",
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  let parts: string[];
  try {
    parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  } catch {
    return <>{text}</>;
  }
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={className}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
