import { describe, expect, it } from "vitest";
import { NoMedicationsFoundError } from "../domain/prescriptionMessage.js";
import { MedicationExtractorPort, PrescriptionParsingError, PrescriptionTextExtractorPort } from "./ports.js";
import { parsePrescription } from "./useCases.js";

class FakeTextExtractor implements PrescriptionTextExtractorPort {
  constructor(private text: string, private shouldFail = false) {}
  async extractText(): Promise<string> {
    if (this.shouldFail) throw new Error("corrupt PDF");
    return this.text;
  }
}

class FakeMedicationExtractor implements MedicationExtractorPort {
  constructor(private medications: string[], private shouldFail = false) {}
  async extractMedications(): Promise<string[]> {
    if (this.shouldFail) throw new Error("LLM unavailable");
    return this.medications;
  }
}

describe("parsePrescription", () => {
  it("builds the same-shaped sentence the structured form would, from extracted medication names", async () => {
    const result = await parsePrescription(Buffer.from("fake pdf bytes"), {
      textExtractor: new FakeTextExtractor("Rx: Aspirin 81mg, Warfarin 5mg"),
      medicationExtractor: new FakeMedicationExtractor(["Aspirin", "Warfarin"]),
    });

    expect(result.medications).toEqual(["Aspirin", "Warfarin"]);
    expect(result.message).toBe("I am taking Aspirin and Warfarin, according to my uploaded prescription.");
  });

  it("throws NoMedicationsFoundError when the PDF has no extractable text", async () => {
    await expect(
      parsePrescription(Buffer.from(""), {
        textExtractor: new FakeTextExtractor(""),
        medicationExtractor: new FakeMedicationExtractor([]),
      })
    ).rejects.toBeInstanceOf(NoMedicationsFoundError);
  });

  it("throws NoMedicationsFoundError when the LLM finds no medications", async () => {
    await expect(
      parsePrescription(Buffer.from("fake pdf bytes"), {
        textExtractor: new FakeTextExtractor("Just a header, no drugs."),
        medicationExtractor: new FakeMedicationExtractor([]),
      })
    ).rejects.toBeInstanceOf(NoMedicationsFoundError);
  });

  it("wraps a text-extraction failure as PrescriptionParsingError", async () => {
    await expect(
      parsePrescription(Buffer.from("bad"), {
        textExtractor: new FakeTextExtractor("", true),
        medicationExtractor: new FakeMedicationExtractor([]),
      })
    ).rejects.toBeInstanceOf(PrescriptionParsingError);
  });

  it("wraps a medication-extraction (LLM) failure as PrescriptionParsingError", async () => {
    await expect(
      parsePrescription(Buffer.from("fake pdf bytes"), {
        textExtractor: new FakeTextExtractor("Rx: Aspirin"),
        medicationExtractor: new FakeMedicationExtractor([], true),
      })
    ).rejects.toBeInstanceOf(PrescriptionParsingError);
  });
});
