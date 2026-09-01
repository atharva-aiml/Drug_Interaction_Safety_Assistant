import { describe, expect, it } from "vitest";
import { buildGenericSymptomTemplate, buildIntakeQuestion } from "./intakeGuidance.js";

describe("buildIntakeQuestion", () => {
  it("asks about all three categories when none are known yet", () => {
    const text = buildIntakeQuestion({ hasMedications: false, hasAllergies: false, hasConditions: false }, []);
    expect(text.toLowerCase()).toContain("medications");
    expect(text.toLowerCase()).toContain("allerg");
    expect(text.toLowerCase()).toContain("condition");
  });

  it("only asks about the categories still missing when medications are already known", () => {
    const text = buildIntakeQuestion({ hasMedications: true, hasAllergies: false, hasConditions: false }, []);
    expect(text.toLowerCase()).not.toContain("medications you're");
    expect(text.toLowerCase()).toContain("allerg");
    expect(text.toLowerCase()).toContain("condition");
  });

  it("leads with the reported symptom when present", () => {
    const text = buildIntakeQuestion({ hasMedications: false, hasAllergies: false, hasConditions: false }, ["nose bleeding"]);
    expect(text).toContain("nose bleeding");
  });

  it("phrases a follow-up (retry) ask distinctly, naming only what's still missing, with no doubled 'before I check' clause", () => {
    const text = buildIntakeQuestion({ hasMedications: true, hasAllergies: true, hasConditions: false }, [], true);
    expect(text.toLowerCase()).toContain("condition");
    expect(text.toLowerCase()).not.toContain("allerg");
    expect((text.match(/before/gi) ?? []).length).toBe(1);
  });
});

describe("buildGenericSymptomTemplate", () => {
  it("names the symptom and never claims a specific cause", () => {
    const text = buildGenericSymptomTemplate(["nose bleeding"]);
    expect(text).toContain("nose bleeding");
    expect(text.toLowerCase()).toContain("healthcare professional");
    expect(text.toLowerCase()).not.toMatch(/\b(caused by|because of|due to)\b/);
  });
});
