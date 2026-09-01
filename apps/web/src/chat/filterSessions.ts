export interface TitledSession {
  title: string;
}

/**
 * Business rule (improvements.md #3.4, Build Plan V2.3.3): session search is
 * a simple case-insensitive substring match on the title — the whole
 * session list is already loaded client-side, so this needs no backend
 * call. Pure, no I/O — a blank query matches everything.
 */
export function filterSessionsByTitle<T extends TitledSession>(sessions: T[], query: string): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return sessions;
  return sessions.filter((s) => s.title.toLowerCase().includes(trimmed));
}
