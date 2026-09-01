import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  DrugInteraction,
  Severity,
} from "@disa/shared-types";

import {
  IncrementalScopeError,
  InteractionValidationError,
} from "../domain/interaction.js";

import {
  DrugCatalogPort,
  DrugNotFoundError,
  InteractionRepository,
} from "./ports.js";

import {
  createInteraction,
  findIncrementalInteractionRisks,
  findInteractionRisks,
} from "./useCases.js";

const WARFARIN = {
  id: "drug-1",
  name: "Warfarin",
};

const ASPIRIN = {
  id: "drug-2",
  name: "Aspirin",
};

const IBUPROFEN = {
  id: "drug-3",
  name: "Ibuprofen",
};

class InMemoryInteractionRepository
  implements InteractionRepository {
  private interactions: DrugInteraction[] = [];

  createCalls: {
    drugAId: string;
    drugBId: string;
    severity: Severity;
  }[] = [];

  async create(
    id: string,
    drugAId: string,
    drugBId: string,
    severity: Severity
  ): Promise<DrugInteraction> {
    this.createCalls.push({
      drugAId,
      drugBId,
      severity,
    });

    const interaction: DrugInteraction = {
      id,

      drugA:
        drugAId === WARFARIN.id
          ? WARFARIN
          : drugAId === ASPIRIN.id
            ? ASPIRIN
            : IBUPROFEN,

      drugB:
        drugBId === WARFARIN.id
          ? WARFARIN
          : drugBId === ASPIRIN.id
            ? ASPIRIN
            : IBUPROFEN,

      severity,
    };

    this.interactions.push(interaction);

    return interaction;
  }

  async findAmong(
    drugIds: string[]
  ): Promise<DrugInteraction[]> {
    const idSet = new Set(drugIds);

    return this.interactions.filter(
      (interaction) =>
        idSet.has(interaction.drugA.id) &&
        idSet.has(interaction.drugB.id)
    );
  }

  async findById(
    id: string
  ): Promise<DrugInteraction | undefined> {
    return this.interactions.find(
      (interaction) =>
        interaction.id === id
    );
  }

  async findInvolving(
    drugId: string,
    otherDrugIds: string[]
  ): Promise<DrugInteraction[]> {
    const otherSet =
      new Set(otherDrugIds);

    return this.interactions.filter(
      (interaction) => {
        if (
          interaction.drugA.id === drugId
        ) {
          return otherSet.has(
            interaction.drugB.id
          );
        }

        if (
          interaction.drugB.id === drugId
        ) {
          return otherSet.has(
            interaction.drugA.id
          );
        }

        return false;
      }
    );
  }
}

/**
 * Fake implementation of the DrugCatalogPort.
 *
 * IMPORTANT:
 * The real catalog supports both:
 *
 * - existingDrugIds()
 * - findByNames()
 *
 * so the test fake must implement both.
 */
class FakeDrugCatalog
  implements DrugCatalogPort {
  private drugsById = new Map<
    string,
    { id: string; name: string }
  >();

  constructor(
    drugs: Array<{
      id: string;
      name: string;
    }> = []
  ) {
    for (const drug of drugs) {
      this.drugsById.set(
        drug.id,
        drug
      );
    }
  }

  async existingDrugIds(
    ids: string[]
  ): Promise<Set<string>> {
    return new Set(
      ids.filter((id) =>
        this.drugsById.has(id)
      )
    );
  }

  async findByNames(
    names: string[]
  ): Promise<
    Array<{
      id: string;
      name: string;
    }>
  > {
    const normalizedNames =
      new Set(
        names
          .map((name) =>
            name.trim().toLowerCase()
          )
          .filter(Boolean)
      );

    return Array.from(
      this.drugsById.values()
    ).filter((drug) =>
      normalizedNames.has(
        drug.name
          .trim()
          .toLowerCase()
      )
    );
  }
}

describe(
  "createInteraction use case",
  () => {
    let interactions: InMemoryInteractionRepository;
    let catalog: FakeDrugCatalog;

    beforeEach(() => {
      interactions =
        new InMemoryInteractionRepository();

      catalog =
        new FakeDrugCatalog([
          WARFARIN,
          ASPIRIN,
        ]);
    });

    it(
      "creates an interaction when severity is valid and both drugs exist",
      async () => {
        const result =
          await createInteraction(
            WARFARIN.id,
            ASPIRIN.id,
            "severe",
            {
              interactions,
              catalog,
              newId: () => "int-1",
            }
          );

        expect(result.id).toBe(
          "int-1"
        );

        expect(
          interactions.createCalls
        ).toHaveLength(1);
      }
    );

    it(
      "rejects and never calls the repository when severity is missing",
      async () => {
        await expect(
          createInteraction(
            WARFARIN.id,
            ASPIRIN.id,
            undefined,
            {
              interactions,
              catalog,
              newId: () => "int-1",
            }
          )
        ).rejects.toBeInstanceOf(
          InteractionValidationError
        );

        expect(
          interactions.createCalls
        ).toHaveLength(0);
      }
    );

    it(
      "rejects when a referenced drug id doesn't exist",
      async () => {
        await expect(
          createInteraction(
            WARFARIN.id,
            "drug-999",
            "severe",
            {
              interactions,
              catalog,
              newId: () => "int-1",
            }
          )
        ).rejects.toBeInstanceOf(
          DrugNotFoundError
        );

        expect(
          interactions.createCalls
        ).toHaveLength(0);
      }
    );

    it(
      "rejects a drug interacting with itself",
      async () => {
        await expect(
          createInteraction(
            WARFARIN.id,
            WARFARIN.id,
            "severe",
            {
              interactions,
              catalog,
              newId: () => "int-1",
            }
          )
        ).rejects.toBeInstanceOf(
          InteractionValidationError
        );
      }
    );
  }
);

describe(
  "findInteractionRisks use case",
  () => {
    it(
      "returns a risk for an interacting pair within the given drug set",
      async () => {
        const interactions =
          new InMemoryInteractionRepository();

        const catalog =
          new FakeDrugCatalog([
            WARFARIN,
            ASPIRIN,
          ]);

        await createInteraction(
          WARFARIN.id,
          ASPIRIN.id,
          "severe",
          {
            interactions,
            catalog,
            newId: () => "int-1",
          }
        );

        const risks =
          await findInteractionRisks(
            [
              WARFARIN.id,
              ASPIRIN.id,
            ],
            {
              interactions,
            }
          );

        expect(risks).toHaveLength(1);
        expect(risks[0].severity).toBe(
          "severe"
        );
        expect(
          risks[0].summary
        ).toContain("Warfarin");
        expect(
          risks[0].summary
        ).toContain("Aspirin");

        /**
         * Critical UI requirement:
         * Cypher must use names, never IDs.
         */
        expect(
          risks[0].cypher?.query
        ).toContain(
          "name: 'Warfarin'"
        );

        expect(
          risks[0].cypher?.query
        ).toContain(
          "name: 'Aspirin'"
        );

        expect(
          risks[0].cypher?.query
        ).not.toContain(
          "id: 'drug-1'"
        );

        expect(
          risks[0].cypher?.query
        ).not.toContain(
          "id: 'drug-2'"
        );
      }
    );

    it(
      "returns no risks for a drug set with no known interactions",
      async () => {
        const interactions =
          new InMemoryInteractionRepository();

        const risks =
          await findInteractionRisks(
            [
              WARFARIN.id,
              IBUPROFEN.id,
            ],
            {
              interactions,
            }
          );

        expect(risks).toEqual([]);
      }
    );

    it(
      "returns no risks for a single medication",
      async () => {
        const interactions =
          new InMemoryInteractionRepository();

        const risks =
          await findInteractionRisks(
            [WARFARIN.id],
            {
              interactions,
            }
          );

        expect(risks).toEqual([]);
      }
    );
  }
);

describe(
  "findIncrementalInteractionRisks use case",
  () => {
    it(
      "finds a risk between the new drug and an existing medication",
      async () => {
        const interactions =
          new InMemoryInteractionRepository();

        const catalog =
          new FakeDrugCatalog([
            WARFARIN,
            ASPIRIN,
          ]);

        await createInteraction(
          WARFARIN.id,
          ASPIRIN.id,
          "severe",
          {
            interactions,
            catalog,
            newId: () => "int-1",
          }
        );

        const risks =
          await findIncrementalInteractionRisks(
            ASPIRIN.id,
            [WARFARIN.id],
            {
              interactions,
            }
          );

        expect(risks).toHaveLength(1);
        expect(risks[0].severity).toBe(
          "severe"
        );
      }
    );

    it(
      "never recomputes a pair among existing medications",
      async () => {
        const interactions =
          new InMemoryInteractionRepository();

        const catalog =
          new FakeDrugCatalog([
            WARFARIN,
            ASPIRIN,
            IBUPROFEN,
          ]);

        await createInteraction(
          WARFARIN.id,
          ASPIRIN.id,
          "severe",
          {
            interactions,
            catalog,
            newId: () => "int-existing",
          }
        );

        const risks =
          await findIncrementalInteractionRisks(
            IBUPROFEN.id,
            [
              WARFARIN.id,
              ASPIRIN.id,
            ],
            {
              interactions,
            }
          );

        expect(risks).toEqual([]);
      }
    );

    it(
      "returns no risks when there are no existing medications",
      async () => {
        const interactions =
          new InMemoryInteractionRepository();

        const risks =
          await findIncrementalInteractionRisks(
            ASPIRIN.id,
            [],
            {
              interactions,
            }
          );

        expect(risks).toEqual([]);
      }
    );

    it(
      "propagates IncrementalScopeError if repository returns an out-of-scope pair",
      async () => {
        const brokenRepo: InteractionRepository =
        {
          async create() {
            throw new Error("unused");
          },

          async findAmong() {
            return [];
          },

          async findById() {
            return undefined;
          },

          async findInvolving() {
            return [
              {
                id: "int-bad",
                drugA: WARFARIN,
                drugB: ASPIRIN,
                severity: "severe",
              },
            ];
          },
        };

        await expect(
          findIncrementalInteractionRisks(
            IBUPROFEN.id,
            [
              WARFARIN.id,
              ASPIRIN.id,
            ],
            {
              interactions: brokenRepo,
            }
          )
        ).rejects.toBeInstanceOf(
          IncrementalScopeError
        );
      }
    );
  }
);