/**
 * Business rule (Build Plan V2.2.0): a network chunk boundary never lines up
 * with a JSON-event boundary — one `chunk` from the reader can contain zero,
 * one, or several complete lines plus a trailing partial one. Pure — takes
 * plain strings, no `fetch`/`ReadableStream` — so the actual line-splitting
 * logic is unit-testable independent of streaming machinery.
 */
export function parseNdjsonChunk(buffer: string, newText: string): { events: unknown[]; remainder: string } {
  const combined = buffer + newText;
  const lines = combined.split("\n");
  const remainder = lines.pop() ?? "";
  const events = lines.filter((line) => line.trim().length > 0).map((line) => JSON.parse(line) as unknown);
  return { events, remainder };
}
