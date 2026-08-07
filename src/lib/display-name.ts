import { getReadContentStore } from "@/content";

/** Human-facing name for a handle: displayName when set, else `@handle`. */
export function displayName(
  handle: string,
  profile?: { displayName?: string } | null,
): string {
  return profile?.displayName?.trim() || `@${handle}`;
}

/** Batch-resolve display names for a set of handles (one profile query each). */
export async function getDisplayNameMap(handles: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(handles)];
  const store = await getReadContentStore();
  const map = new Map<string, string>();
  for (const handle of unique) {
    const profile = await store?.getProfile(handle);
    map.set(handle, displayName(handle, profile));
  }
  return map;
}
