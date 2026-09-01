import { describe, expect, it } from "vitest";
import { buildDosageNotice, buildMultiPersonNotice, detectDosageMention, detectMultiPersonMention } from "./limitationNotices.js";

describe("detectMultiPersonMention", () => {
  it("matches a caregiver phrasing naming another person's medications", () => {
    expect(detectMultiPersonMention("my daughter takes amoxicillin")).toBe(true);
    expect(detectMultiPersonMention("my husband is allergic to penicillin")).toBe(true);
    expect(detectMultiPersonMention("my mom has a condition called diabetes")).toBe(true);
  });

  it("does not flag the user talking about their own medications", () => {
    expect(detectMultiPersonMention("I am taking aspirin and warfarin")).toBe(false);
  });

  it("does not flag an unrelated mention of a family member", () => {
    expect(detectMultiPersonMention("my daughter is visiting this weekend")).toBe(false);
  });
});

describe("buildMultiPersonNotice", () => {
  it("is a fixed, non-empty disclosure message", () => {
    const text = buildMultiPersonNotice();
    expect(text.toLowerCase()).toContain("one person");
    expect(text).toBe(buildMultiPersonNotice());
  });
});

describe("detectDosageMention", () => {
  it("matches an explicit dosage amount", () => {
    expect(detectDosageMention("I take 500mg of aspirin")).toBe(true);
    expect(detectDosageMention("10 mg twice a day")).toBe(true);
  });

  it("matches a frequency phrasing without a unit", () => {
    expect(detectDosageMention("I take it twice a day")).toBe(true);
    expect(detectDosageMention("every 8 hours")).toBe(true);
  });

  it("does not flag a message with no dosage/frequency information", () => {
    expect(detectDosageMention("I am taking aspirin and warfarin")).toBe(false);
  });
});

describe("buildDosageNotice", () => {
  it("is a fixed, non-empty disclosure message", () => {
    const text = buildDosageNotice();
    expect(text.toLowerCase()).toContain("dosage");
    expect(text).toBe(buildDosageNotice());
  });
});
