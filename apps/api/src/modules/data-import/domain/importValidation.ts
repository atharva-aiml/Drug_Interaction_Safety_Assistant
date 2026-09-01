import { SEVERITIES } from "@disa/shared-types";

/**
 * Severity values accepted by the importer.
 *
 * Some datasets use "contraindicated" in addition to the
 * application's normal minor/moderate/severe values.
 *
 * We intentionally support it here because it carries
 * important clinical meaning in the CSV.
 */
const IMPORT_SEVERITIES = new Set<string>([
  ...SEVERITIES,
  "contraindicated",
]);

export interface RelationshipEntry {
  name: string;
  severity: string;

  /**
   * Only populated for interactsWith entries.
   */
  risk?: string;

  /**
   * Only populated for interactsWith entries.
   */
  tip?: string;
}

export interface TextListEntry {
  name: string;
  text: string;
}

export interface ParsedRelationships {
  interactsWith: RelationshipEntry[];
  containsAllergen: RelationshipEntry[];
  contraindicatedFor: RelationshipEntry[];
}

export interface RowValidationResult {
  accepted: boolean;
  reason?: string;
  relationships?: ParsedRelationships;
}

const SSN_PATTERN =
  /\b\d{3}-\d{2}-\d{4}\b/;

const MRN_PATTERN =
  /\bMRN[-:\s]*\d{6,10}\b/i;

const DRUG_REQUIRED_FIELDS = [
  "name",
  "genericName",
  "drugClass",
  "dosageForm",
] as const;

const RELATIONSHIP_COLUMNS = [
  "interactsWith",
  "containsAllergen",
  "contraindicatedFor",
] as const;

/**
 * Detect obvious medical/personal identifiers.
 */
export function detectPII(
  value: string
): string | undefined {
  if (
    SSN_PATTERN.test(value)
  ) {
    return 'matches an SSN-like pattern ("XXX-XX-XXXX")';
  }

  if (
    MRN_PATTERN.test(value)
  ) {
    return 'matches a medical-record-number-like pattern ("MRN" + digits)';
  }

  return undefined;
}

export class PIIDetectedError extends Error {
  constructor(
    public field: string,
    public reason: string
  ) {
    super(
      `Field "${field}" ${reason}`
    );
  }
}

export function assertNoPII(
  row: Record<string, string>
): void {
  for (const [
    field,
    value,
  ] of Object.entries(row)) {
    const reason =
      detectPII(value ?? "");

    if (reason) {
      throw new PIIDetectedError(
        field,
        reason
      );
    }
  }
}

/**
 * Normalize names consistently everywhere in the import pipeline.
 */
export function normalizeName(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Parses:
 *
 * Name:severity;Name:severity
 *
 * Empty values are valid.
 *
 * "contraindicated" is intentionally accepted because
 * the supplied CSV uses it.
 */
export function parseRelationshipList(
  raw: string | undefined
):
  | {
    ok: true;
    entries: RelationshipEntry[];
  }
  | {
    ok: false;
    reason: string;
  } {
  const trimmed =
    raw?.trim();

  if (!trimmed) {
    return {
      ok: true,
      entries: [],
    };
  }

  const entries: RelationshipEntry[] =
    [];

  for (
    const part of trimmed.split(";")
  ) {
    const piece =
      part.trim();

    if (!piece) {
      continue;
    }

    const colonIndex =
      piece.indexOf(":");

    if (colonIndex === -1) {
      return {
        ok: false,
        reason:
          `malformed entry "${piece}" — expected "Name:severity"`,
      };
    }

    const name =
      piece
        .slice(0, colonIndex)
        .trim();

    const severity =
      piece
        .slice(colonIndex + 1)
        .trim()
        .toLowerCase();

    if (!name) {
      return {
        ok: false,
        reason:
          `malformed entry "${piece}" — drug/entity name is missing`,
      };
    }

    if (!severity) {
      return {
        ok: false,
        reason:
          `malformed entry "${piece}" — severity is missing`,
      };
    }

    if (
      !IMPORT_SEVERITIES.has(
        severity
      )
    ) {
      return {
        ok: false,
        reason:
          `unknown severity "${severity}" in "${piece}" — supported values: ${Array.from(
            IMPORT_SEVERITIES
          ).join(", ")}`,
      };
    }

    entries.push({
      name,
      severity,
    });
  }

  return {
    ok: true,
    entries,
  };
}

/**
 * Parses:
 *
 * Name:text;Name:text
 *
 * Empty values are valid.
 */
export function parseTextList(
  raw: string | undefined
):
  | {
    ok: true;
    entries: TextListEntry[];
  }
  | {
    ok: false;
    reason: string;
  } {
  const trimmed =
    raw?.trim();

  if (!trimmed) {
    return {
      ok: true,
      entries: [],
    };
  }

  const entries: TextListEntry[] =
    [];

  for (
    const part of trimmed.split(";")
  ) {
    const piece =
      part.trim();

    if (!piece) {
      continue;
    }

    const colonIndex =
      piece.indexOf(":");

    if (colonIndex === -1) {
      return {
        ok: false,
        reason:
          `malformed entry "${piece}" — expected "Name:text"`,
      };
    }

    const name =
      piece
        .slice(0, colonIndex)
        .trim();

    const text =
      piece
        .slice(colonIndex + 1)
        .trim();

    if (!name || !text) {
      return {
        ok: false,
        reason:
          `malformed entry "${piece}" — expected "Name:text"`,
      };
    }

    entries.push({
      name,
      text,
    });
  }

  return {
    ok: true,
    entries,
  };
}

/**
 * Validate a drug row.
 *
 * Important design decision:
 *
 * The four core drug fields determine whether a Drug node
 * can exist. Relationship columns are validated separately.
 *
 * This prevents a problem in one optional relationship
 * from causing the entire medication to disappear
 * from Neo4j.
 */
export function validateDrugRow(
  row: Record<string, string>
): RowValidationResult {
  try {
    assertNoPII(row);
  } catch (err) {
    if (
      err instanceof PIIDetectedError
    ) {
      return {
        accepted: false,
        reason:
          `Rejected: possible PII — ${err.message}`,
      };
    }

    throw err;
  }

  const missing =
    DRUG_REQUIRED_FIELDS.filter(
      (field) =>
        !row[field]?.trim()
    );

  if (missing.length > 0) {
    return {
      accepted: false,
      reason:
        `Missing required field(s): ${missing.join(", ")}`,
    };
  }

  const relationships: ParsedRelationships =
  {
    interactsWith: [],
    containsAllergen: [],
    contraindicatedFor: [],
  };

  /**
   * Relationship parsing is deliberately isolated.
   *
   * If one relationship column is malformed, we don't
   * reject the Drug itself.
   *
   * The importer can report the relationship error while
   * still importing the medication node.
   */
  for (
    const column of RELATIONSHIP_COLUMNS
  ) {
    const parsed =
      parseRelationshipList(
        row[column]
      );

    if (!parsed.ok) {
      /**
       * Keep the drug accepted but leave the problematic
       * relationship column empty.
       *
       * The import worker will report this as a warning.
       */
      relationships[column] =
        [];
      continue;
    }

    relationships[column] =
      parsed.entries;
  }

  /**
   * Optional enrichment columns.
   */
  const risksParsed =
    parseTextList(row.risks);

  const tipsParsed =
    parseTextList(row.tips);

  /**
   * Build lookup maps only from successfully parsed
   * enrichment columns.
   */
  const riskByName =
    new Map<string, string>();

  if (risksParsed.ok) {
    for (
      const entry of risksParsed.entries
    ) {
      riskByName.set(
        normalizeName(entry.name),
        entry.text
      );
    }
  }

  const tipByName =
    new Map<string, string>();

  if (tipsParsed.ok) {
    for (
      const entry of tipsParsed.entries
    ) {
      tipByName.set(
        normalizeName(entry.name),
        entry.text
      );
    }
  }

  /**
   * Attach risk/tip text to interactions.
   */
  relationships.interactsWith =
    relationships.interactsWith.map(
      (entry) => ({
        ...entry,

        risk:
          riskByName.get(
            normalizeName(entry.name)
          ),

        tip:
          tipByName.get(
            normalizeName(entry.name)
          ),
      })
    );

  return {
    accepted: true,
    relationships,
  };
}