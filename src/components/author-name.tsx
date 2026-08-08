"use client";

import { useDisplayName } from "@/components/use-display-name";

/**
 * Renders a handle's public display name (displayName when set, else `@handle`).
 */
export function AuthorName({
  handle,
  className,
}: {
  handle: string;
  className?: string;
}) {
  const name = useDisplayName(handle);
  return <span className={className}>{name}</span>;
}
