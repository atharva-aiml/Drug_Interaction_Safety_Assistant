import { AllergyLink, ContraindicationLink, DrugInteraction } from "@disa/shared-types";

export interface InteractionLookupPort {
  findById(id: string): Promise<DrugInteraction | undefined>;
}

export interface AllergyLinkLookupPort {
  findById(id: string): Promise<AllergyLink | undefined>;
}

export interface ContraindicationLookupPort {
  findById(id: string): Promise<ContraindicationLink | undefined>;
}

export interface PatientRef {
  id: string;
  displayName: string;
}

export interface PatientLookupPort {
  findById(patientId: string): Promise<PatientRef | undefined>;
}

export class RiskNotFoundError extends Error {
  constructor(riskId: string) {
    super(`No risk with id ${riskId}`);
  }
}
