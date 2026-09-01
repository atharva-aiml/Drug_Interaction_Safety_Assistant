export interface CatalogEntry {
  id: string;
  name: string;
}

export interface ConfirmationCandidate {
  id: string;
  name: string;
}

/**
 * A name never resolves silently past an exact match anymore (improvements.md
 * #1.3/#1.4, Build Plan V2.1.4/V2.1.5) — "resolved" is reserved for an exact
 * case-insensitive catalog hit. Anything reached only via the fuzzy fallback
 * comes back as `needsConfirmation` (one close candidate) or `ambiguous`
 * (several candidates too close to each other to guess between) so the
 * caller can ask rather than silently pick — the failure mode this app
 * exists to prevent is a wrong SILENT match, not a wrong match per se.
 */
export type ResolutionOutcome =
  | { kind: "resolved"; id: string; matchedName: string; queryName: string }
  | { kind: "unresolved"; queryName: string }
  | { kind: "needsConfirmation"; queryName: string; candidate: ConfirmationCandidate }
  | { kind: "ambiguous"; queryName: string; candidates: ConfirmationCandidate[] };

/** Similarity below this (1 - normalized edit distance) is treated as no match at all. */
const FUZZY_SIMILARITY_THRESHOLD = 0.75;

/** Candidates within this similarity of the best one are "too close to guess between" — ambiguous, not a confident single fuzzy match. */
const AMBIGUITY_CLUSTER_DELTA = 0.05;

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[rows - 1][cols - 1];
}

function similarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Resolves one free-text name (from LLM extraction) against the real
 * catalog: exact case-insensitive match first (same precedent as
 * data-import's name.toLowerCase() matching) resolves immediately; anything
 * else that's merely close goes back for confirmation/disambiguation instead
 * of being silently accepted (Requirements §3 business rule).
 */
export function resolveEntityName(queryName: string, catalog: CatalogEntry[]): ResolutionOutcome {
  const trimmed = queryName.trim();
  if (!trimmed) return { kind: "unresolved", queryName: trimmed };

  const lower = trimmed.toLowerCase();
  const exact = catalog.find((entry) => entry.name.toLowerCase() === lower);
  if (exact) {
    return { kind: "resolved", id: exact.id, matchedName: exact.name, queryName: trimmed };
  }

  const scored = catalog
    .map((entry) => ({ entry, similarity: similarity(lower, entry.name.toLowerCase()) }))
    .filter((s) => s.similarity >= FUZZY_SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity);

  if (scored.length === 0) {
    return { kind: "unresolved", queryName: trimmed };
  }

  const best = scored[0];
  const cluster = scored.filter((s) => best.similarity - s.similarity < AMBIGUITY_CLUSTER_DELTA);

  if (cluster.length > 1) {
    return {
      kind: "ambiguous",
      queryName: trimmed,
      candidates: cluster.map((s) => ({ id: s.entry.id, name: s.entry.name })),
    };
  }

  return {
    kind: "needsConfirmation",
    queryName: trimmed,
    candidate: { id: best.entry.id, name: best.entry.name },
  };
}

export interface PartitionedResolution {
  resolvedIds: string[];
  unresolvedNames: string[];
  needsConfirmation: { queryName: string; candidate: ConfirmationCandidate }[];
  ambiguous: { queryName: string; candidates: ConfirmationCandidate[] }[];
}

export function resolveEntityNames(names: string[], catalog: CatalogEntry[]): PartitionedResolution {
  const result: PartitionedResolution = { resolvedIds: [], unresolvedNames: [], needsConfirmation: [], ambiguous: [] };
  for (const name of names) {
    if (!name || !name.trim()) continue;
    const outcome = resolveEntityName(name, catalog);
    switch (outcome.kind) {
      case "resolved":
        result.resolvedIds.push(outcome.id);
        break;
      case "unresolved":
        result.unresolvedNames.push(outcome.queryName);
        break;
      case "needsConfirmation":
        result.needsConfirmation.push({ queryName: outcome.queryName, candidate: outcome.candidate });
        break;
      case "ambiguous":
        result.ambiguous.push({ queryName: outcome.queryName, candidates: outcome.candidates });
        break;
    }
  }
  return result;
}

const AFFIRMATIVE_WORDS = ["yes", "yeah", "yep", "yup", "correct", "right", "confirm", "confirmed", "sure", "exactly"];
const NEGATIVE_WORDS = ["no", "nope", "not", "incorrect", "wrong"];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(text);
}

/**
 * Deterministic yes/no interpretation of a reply to a confirmation question
 * (e.g. "Did you mean Penicillin?") — never an LLM judgment call, same
 * reasoning as `detectEmergency`: a safety-relevant "did I match the right
 * drug" gate shouldn't depend on a model's phrasing sense. Returns
 * `undefined` when the reply is genuinely unclear (neither word present, or
 * both — e.g. "no, I mean Penicillin" would need the disambiguation path,
 * not this one).
 */
export function interpretYesNo(reply: string): boolean | undefined {
  const trimmed = reply.trim();
  const yes = AFFIRMATIVE_WORDS.some((w) => containsWord(trimmed, w));
  const no = NEGATIVE_WORDS.some((w) => containsWord(trimmed, w));
  if (yes && !no) return true;
  if (no && !yes) return false;
  return undefined;
}

/**
 * Deterministic disambiguation-reply matching: picks the candidate whose
 * name literally appears in the reply. No fuzzy/LLM guessing here either —
 * if none of the candidate names appear, the caller treats it as still
 * unresolved rather than guessing which one was meant.
 */
export function pickDisambiguationChoice(reply: string, candidates: ConfirmationCandidate[]): ConfirmationCandidate | undefined {
  const lower = reply.toLowerCase();
  return candidates.find((c) => lower.includes(c.name.toLowerCase()));
}
