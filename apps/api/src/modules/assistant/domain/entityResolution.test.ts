import { describe, expect, it } from "vitest";
import { CatalogEntry, interpretYesNo, pickDisambiguationChoice, resolveEntityName, resolveEntityNames } from "./entityResolution.js";

const CATALOG: CatalogEntry[] = [
  { id: "d1", name: "Aspirin" },
  { id: "d2", name: "Warfarin" },
  { id: "d3", name: "Ibuprofen" },
  { id: "d4", name: "Metformin" },
  { id: "d5", name: "Metoprolol" },
];

describe("resolveEntityName", () => {
  it("resolves an exact, case-insensitive match immediately", () => {
    const result = resolveEntityName("aspirin", CATALOG);
    expect(result).toEqual({ kind: "resolved", id: "d1", matchedName: "Aspirin", queryName: "aspirin" });
  });

  it("asks for confirmation on a close typo rather than silently accepting it (improvements.md #1.3)", () => {
    const result = resolveEntityName("Warfarn", CATALOG);
    expect(result.kind).toBe("needsConfirmation");
    if (result.kind === "needsConfirmation") {
      expect(result.candidate.id).toBe("d2");
      expect(result.candidate.name).toBe("Warfarin");
    }
  });

  it("flags two equally-close near-matches as ambiguous instead of picking one (improvements.md #1.4)", () => {
    // Constructed so both candidates are exactly one edit away from the query
    // (same length, same distance) — a guaranteed tie, not dependent on the
    // exact edit-distance of any particular real drug-name pair.
    const catalog: CatalogEntry[] = [
      { id: "x1", name: "Amoxin" },
      { id: "x2", name: "Amoxid" },
      { id: "x3", name: "Ibuprofen" },
    ];
    const result = resolveEntityName("Amoxil", catalog);
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      const names = result.candidates.map((c) => c.name).sort();
      expect(names).toEqual(["Amoxid", "Amoxin"]);
    }
  });

  it("does not guess past the similarity threshold", () => {
    const result = resolveEntityName("Xyzzyxplorq", CATALOG);
    expect(result.kind).toBe("unresolved");
  });

  it("treats a blank name as unresolved rather than matching arbitrarily", () => {
    const result = resolveEntityName("   ", CATALOG);
    expect(result.kind).toBe("unresolved");
  });
});

describe("resolveEntityNames", () => {
  it("partitions a mixed list into resolved/unresolved/needsConfirmation/ambiguous buckets", () => {
    const catalog: CatalogEntry[] = [...CATALOG, { id: "x1", name: "Amoxin" }, { id: "x2", name: "Amoxid" }];
    const result = resolveEntityNames(["Aspirin", "Nonexistentdrugxyz", "Warfarn", "Amoxil"], catalog);
    expect(result.resolvedIds).toEqual(["d1"]);
    expect(result.unresolvedNames).toEqual(["Nonexistentdrugxyz"]);
    expect(result.needsConfirmation).toHaveLength(1);
    expect(result.needsConfirmation[0].candidate.id).toBe("d2");
    expect(result.ambiguous).toHaveLength(1);
  });

  it("never resolves anything against an empty catalog", () => {
    const result = resolveEntityNames(["Aspirin"], []);
    expect(result.resolvedIds).toEqual([]);
    expect(result.unresolvedNames).toEqual(["Aspirin"]);
  });
});

describe("interpretYesNo", () => {
  it("recognizes common affirmative replies", () => {
    expect(interpretYesNo("yes")).toBe(true);
    expect(interpretYesNo("Yeah, that's right")).toBe(true);
    expect(interpretYesNo("Correct")).toBe(true);
  });

  it("recognizes common negative replies", () => {
    expect(interpretYesNo("no")).toBe(false);
    expect(interpretYesNo("nope")).toBe(false);
    expect(interpretYesNo("that's wrong")).toBe(false);
  });

  it("returns undefined for an unclear reply", () => {
    expect(interpretYesNo("I take Metoprolol")).toBeUndefined();
  });

  it("does not false-positive on a word merely containing a negative token", () => {
    expect(interpretYesNo("Naproxen")).toBeUndefined();
  });
});

describe("pickDisambiguationChoice", () => {
  const candidates = [
    { id: "d4", name: "Metformin" },
    { id: "d5", name: "Metoprolol" },
  ];

  it("picks the candidate whose exact name is present in the reply", () => {
    expect(pickDisambiguationChoice("I meant Metoprolol", candidates)?.id).toBe("d5");
  });

  it("is case-insensitive", () => {
    expect(pickDisambiguationChoice("metformin, yes", candidates)?.id).toBe("d4");
  });

  it("returns undefined when no candidate name appears in the reply", () => {
    expect(pickDisambiguationChoice("neither of those", candidates)).toBeUndefined();
  });
});
