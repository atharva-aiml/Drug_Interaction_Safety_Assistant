export interface PinnableSession {
  pinned: boolean;
}

/**
 * Splits an already-ordered session list into pinned/unpinned groups for the
 * sidebar's separate "Pinned" section — preserves each group's relative
 * order (both come pre-sorted newest-first from the API) rather than
 * re-sorting. Pure, no I/O.
 */
export function groupSessionsByPinned<T extends PinnableSession>(sessions: T[]): { pinned: T[]; unpinned: T[] } {
  return {
    pinned: sessions.filter((s) => s.pinned),
    unpinned: sessions.filter((s) => !s.pinned),
  };
}
