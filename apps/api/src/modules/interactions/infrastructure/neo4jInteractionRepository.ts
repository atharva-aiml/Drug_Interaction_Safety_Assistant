import { DrugInteraction, Severity } from "@disa/shared-types";
import { getSession } from "../../../db/neo4jClient.js";
import { InteractionRepository } from "../application/ports.js";

function toDrugInteraction(
  a: { id: string; name: string },
  b: { id: string; name: string },
  rProps: Record<string, unknown>
): DrugInteraction {
  return {
    id: rProps.id as string,
    drugA: a,
    drugB: b,
    severity: rProps.severity as Severity,
    ...(rProps.riskDescription
      ? {
        riskDescription:
          rProps.riskDescription as string,
      }
      : {}),
    ...(rProps.tip
      ? {
        tip: rProps.tip as string,
      }
      : {}),
  };
}

export class Neo4jInteractionRepository
  implements InteractionRepository {
  /**
   * Creates/updates an undirected INTERACTS_WITH relationship.
   *
   * The relationship is intentionally undirected because drug-drug
   * interactions are symmetric for the risk-check engine.
   */
  async create(
    id: string,
    drugAId: string,
    drugBId: string,
    severity: Severity,
    riskDescription?: string,
    tip?: string
  ): Promise<DrugInteraction> {
    const session = getSession();

    try {
      const result = await session.run(
        `
        MATCH (a:Drug {id: $drugAId}),
              (b:Drug {id: $drugBId})

        MERGE (a)-[r:INTERACTS_WITH]-(b)

        ON CREATE SET
          r.id = $id

        SET
          r.severity = $severity,
          r.riskDescription =
            coalesce($riskDescription, r.riskDescription),
          r.tip =
            coalesce($tip, r.tip)

        RETURN a, b, r
        `,
        {
          id,
          drugAId,
          drugBId,
          severity,
          riskDescription:
            riskDescription ?? null,
          tip: tip ?? null,
        }
      );

      if (result.records.length === 0) {
        throw new Error(
          `Could not create interaction between drugs ${drugAId} and ${drugBId}.`
        );
      }

      const record = result.records[0];

      return toDrugInteraction(
        {
          id: record.get("a").properties.id,
          name: record.get("a").properties.name,
        },
        {
          id: record.get("b").properties.id,
          name: record.get("b").properties.name,
        },
        record.get("r").properties
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Finds every interaction where BOTH drugs belong to the
   * supplied medication ID set.
   *
   * IMPORTANT:
   * The relationship is matched without -> because
   * INTERACTS_WITH is undirected.
   */
  async findAmong(
    drugIds: string[]
  ): Promise<DrugInteraction[]> {
    if (drugIds.length < 2) {
      return [];
    }

    const session = getSession();

    try {
      const result = await session.run(
        `
        MATCH (a:Drug)-[r:INTERACTS_WITH]-(b:Drug)

        WHERE a.id IN $drugIds
          AND b.id IN $drugIds

        RETURN a, b, r
        `,
        {
          drugIds,
        }
      );

      return result.records.map((record) =>
        toDrugInteraction(
          {
            id: record.get("a").properties.id,
            name: record.get("a").properties.name,
          },
          {
            id: record.get("b").properties.id,
            name: record.get("b").properties.name,
          },
          record.get("r").properties
        )
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Finds all interactions involving one newly added medication
   * and one of the patient's existing medications.
   */
  async findInvolving(
    drugId: string,
    otherDrugIds: string[]
  ): Promise<DrugInteraction[]> {
    if (otherDrugIds.length === 0) {
      return [];
    }

    const session = getSession();

    try {
      const result = await session.run(
        `
        MATCH (d:Drug {id: $drugId})
              -[r:INTERACTS_WITH]-
              (other:Drug)

        WHERE other.id IN $otherDrugIds

        RETURN d, other, r
        `,
        {
          drugId,
          otherDrugIds,
        }
      );

      return result.records.map((record) =>
        toDrugInteraction(
          {
            id: record.get("d").properties.id,
            name: record.get("d").properties.name,
          },
          {
            id: record.get("other").properties.id,
            name: record.get("other").properties.name,
          },
          record.get("r").properties
        )
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Finds an interaction by relationship ID.
   *
   * Uses an undirected relationship pattern because
   * INTERACTS_WITH is modeled as symmetric.
   */
  async findById(
    id: string
  ): Promise<DrugInteraction | undefined> {
    const session = getSession();

    try {
      const result = await session.run(
        `
        MATCH (a:Drug)-[r:INTERACTS_WITH {id: $id}]-(b:Drug)
        RETURN a, b, r
        `,
        {
          id,
        }
      );

      if (result.records.length === 0) {
        return undefined;
      }

      const record = result.records[0];

      return toDrugInteraction(
        {
          id: record.get("a").properties.id,
          name: record.get("a").properties.name,
        },
        {
          id: record.get("b").properties.id,
          name: record.get("b").properties.name,
        },
        record.get("r").properties
      );
    } finally {
      await session.close();
    }
  }
}