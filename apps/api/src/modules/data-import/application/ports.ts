import { Drug, ImportEntityType, ImportJob, ImportJobStatus, ImportRowError } from "@disa/shared-types";

export interface ImportJobRepository {
  create(job: ImportJob): Promise<void>;
  update(
    id: string,
    patch: Partial<{ status: ImportJobStatus; acceptedCount: number; rejectedCount: number; errors: ImportRowError[] }>
  ): Promise<void>;
  findById(id: string): Promise<ImportJob | undefined>;
}

/** Only what the import module needs from the Drug aggregate — real impl reuses the drugs module's schema. */
export interface DrugImportRepository {
  create(drug: Omit<Drug, "id">): Promise<Drug>;
}

/**
 * Resolves a plain-text name from a relationship column to an existing or
 * newly-created reference node — neither the allergens nor diseases module
 * exposes a find-by-name query today, so the import module owns this lookup
 * itself, same as it already owns `DrugImportRepository` above.
 */
export interface AllergenImportRepository {
  findOrCreateByName(name: string): Promise<{ id: string; name: string }>;
}

export interface DiseaseImportRepository {
  findOrCreateByName(name: string): Promise<{ id: string; name: string }>;
}

export class ImportJobNotFoundError extends Error {
  constructor(id: string) {
    super(`No import job with id ${id}`);
  }
}

export type { ImportEntityType };
