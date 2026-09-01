import { v4 as uuid } from "uuid";
import { Drug } from "@disa/shared-types";
import { getSession } from "../../db/neo4jClient.js";

export async function createDrug(input: Omit<Drug, "id">): Promise<Drug> {
  const id = uuid();
  const session = getSession();
  try {
    await session.run(
      `CREATE (d:Drug {id: $id, name: $name, genericName: $genericName, drugClass: $drugClass, dosageForm: $dosageForm})`,
      { id, ...input }
    );
    return { id, ...input };
  } finally {
    await session.close();
  }
}

export async function listDrugs(): Promise<Drug[]> {
  const session = getSession();
  try {
    const result = await session.run("MATCH (d:Drug) WHERE d.deletedAt IS NULL RETURN d ORDER BY d.name");
    return result.records.map((record) => {
      const props = record.get("d").properties;
      return {
        id: props.id,
        name: props.name,
        genericName: props.genericName,
        drugClass: props.drugClass,
        dosageForm: props.dosageForm,
      };
    });
  } finally {
    await session.close();
  }
}

export class DrugNotFoundError extends Error {
  constructor(id: string) {
    super(`No drug with id ${id}`);
  }
}

export async function updateDrug(id: string, input: Omit<Drug, "id">): Promise<Drug> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (d:Drug {id: $id})
       SET d.name = $name, d.genericName = $genericName, d.drugClass = $drugClass, d.dosageForm = $dosageForm
       RETURN d`,
      { id, ...input }
    );
    if (result.records.length === 0) {
      throw new DrugNotFoundError(id);
    }
    const props = result.records[0].get("d").properties;
    return {
      id: props.id,
      name: props.name,
      genericName: props.genericName,
      drugClass: props.drugClass,
      dosageForm: props.dosageForm,
      ...(props.deletedAt ? { deletedAt: props.deletedAt } : {}),
    };
  } finally {
    await session.close();
  }
}

export class DrugAlreadyDeletedError extends Error {
  constructor(id: string) {
    super(`Drug ${id} is already deleted.`);
  }
}

export async function deleteDrug(id: string): Promise<Drug> {
  const session = getSession();
  try {
    const existingResult = await session.run("MATCH (d:Drug {id: $id}) RETURN d", { id });
    if (existingResult.records.length === 0) {
      throw new DrugNotFoundError(id);
    }
    const existingProps = existingResult.records[0].get("d").properties;
    if (existingProps.deletedAt) {
      throw new DrugAlreadyDeletedError(id);
    }

    const deletedAt = new Date().toISOString();
    const result = await session.run(
      "MATCH (d:Drug {id: $id}) SET d.deletedAt = $deletedAt RETURN d",
      { id, deletedAt }
    );
    const props = result.records[0].get("d").properties;
    return {
      id: props.id,
      name: props.name,
      genericName: props.genericName,
      drugClass: props.drugClass,
      dosageForm: props.dosageForm,
      deletedAt: props.deletedAt,
    };
  } finally {
    await session.close();
  }
}

export async function listDeletedDrugs(): Promise<Drug[]> {
  const session = getSession();
  try {
    const result = await session.run(
      "MATCH (d:Drug) WHERE d.deletedAt IS NOT NULL RETURN d ORDER BY d.deletedAt DESC"
    );
    return result.records.map((record) => {
      const props = record.get("d").properties;
      return {
        id: props.id,
        name: props.name,
        genericName: props.genericName,
        drugClass: props.drugClass,
        dosageForm: props.dosageForm,
        deletedAt: props.deletedAt,
      };
    });
  } finally {
    await session.close();
  }
}
