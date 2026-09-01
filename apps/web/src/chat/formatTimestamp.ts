const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Business rule (improvements.md #2.10, Build Plan V2.2.9): a relative
 * timestamp for recent messages, falling back to an absolute time once it's
 * old enough that "N hours ago" stops being useful. Pure — takes `now`
 * explicitly so it's unit-testable without mocking the system clock.
 */
export function formatMessageTimestamp(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();

  if (diffMs < MINUTE_MS) return "Just now";
  if (diffMs < HOUR_MS) {
    const minutes = Math.floor(diffMs / MINUTE_MS);
    return `${minutes}m ago`;
  }
  if (diffMs < DAY_MS && then.toDateString() === now.toDateString()) {
    const hours = Math.floor(diffMs / HOUR_MS);
    return `${hours}h ago`;
  }
  return then.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
