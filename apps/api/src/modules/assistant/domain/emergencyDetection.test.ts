import { describe, expect, it } from "vitest";
import { buildEmergencyResponse, detectEmergency } from "./emergencyDetection.js";

describe("detectEmergency", () => {
  it("matches common breathing-emergency phrasings", () => {
    expect(detectEmergency("I can't breathe")?.category).toBe("breathing difficulty");
    expect(detectEmergency("having trouble breathing right now")?.category).toBe("breathing difficulty");
    expect(detectEmergency("my throat is closing")?.category).toBe("breathing difficulty");
  });

  it("matches shortness-of-breath and tight-throat phrasings", () => {
    expect(detectEmergency("I am facing breath shortage")?.category).toBe("breathing difficulty");
    expect(detectEmergency("I have shortness of breath")?.category).toBe("breathing difficulty");
    expect(detectEmergency("I am short of breath")?.category).toBe("breathing difficulty");
    expect(detectEmergency("I am facing tight throat")?.category).toBe("breathing difficulty");
    expect(detectEmergency("my throat feels tight")?.category).toBe("breathing difficulty");
  });

  it("matches chest pain", () => {
    expect(detectEmergency("I am having severe chest pain")?.category).toBe("chest pain");
  });

  it("matches rapid-heart-rate phrasings, including a loose paraphrase", () => {
    expect(detectEmergency("My heart is beating fast")?.category).toBe("rapid heart rate");
    expect(detectEmergency("my heart is racing")?.category).toBe("rapid heart rate");
    expect(detectEmergency("I have a racing heart")?.category).toBe("rapid heart rate");
    expect(detectEmergency("I think I have a high heart rate")?.category).toBe("rapid heart rate");
    expect(detectEmergency("I am experiencing palpitations")?.category).toBe("rapid heart rate");
    expect(detectEmergency("my pulse feels really fast")?.category).toBe("rapid heart rate");
  });

  it("matches possible-stroke warning signs", () => {
    expect(detectEmergency("my face is drooping on one side")?.category).toBe("possible stroke");
    expect(detectEmergency("I am slurring my words")?.category).toBe("possible stroke");
    expect(detectEmergency("I have sudden numbness in my arm")?.category).toBe("possible stroke");
    expect(detectEmergency("this is the worst headache of my life")?.category).toBe("possible stroke");
  });

  it("matches fainting and severe-dizziness phrasings", () => {
    expect(detectEmergency("I feel like I'm going to faint")?.category).toBe("fainting");
    expect(detectEmergency("I am extremely dizzy")?.category).toBe("fainting");
  });

  it("matches high fever and severe rigidity/shaking phrasings", () => {
    expect(detectEmergency("I have a very high fever")?.category).toBe("high fever");
    expect(detectEmergency("I am shaking uncontrollably")?.category).toBe("severe muscle rigidity or shaking");
    expect(detectEmergency("my muscles feel completely rigid")?.category).toBe("severe muscle rigidity or shaking");
  });

  it("matches allergic-reaction and anaphylaxis phrasings", () => {
    expect(detectEmergency("my face is swelling up")?.category).toBe("allergic reaction");
    expect(detectEmergency("I think this is anaphylaxis")?.category).toBe("allergic reaction");
  });

  it("matches overdose phrasings", () => {
    expect(detectEmergency("I took too many pills")?.category).toBe("overdose");
  });

  it("matches self-harm risk phrasings", () => {
    expect(detectEmergency("I want to kill myself")?.category).toBe("self-harm risk");
  });

  it("is case-insensitive", () => {
    expect(detectEmergency("I CAN'T BREATHE")?.category).toBe("breathing difficulty");
  });

  it("does not flag ordinary, non-emergency symptom mentions", () => {
    expect(detectEmergency("I have a mild headache")).toBeUndefined();
    expect(detectEmergency("I am facing nose bleeding")).toBeUndefined();
    expect(detectEmergency("I feel a bit dizzy")).toBeUndefined();
    expect(detectEmergency("I am taking aspirin and warfarin")).toBeUndefined();
    expect(detectEmergency("I have a slight fever today")).toBeUndefined();
    expect(detectEmergency("my hands shake a little in the morning")).toBeUndefined();
    expect(detectEmergency("my heart rate was normal at my last checkup")).toBeUndefined();
  });

  it("reports the specific matched phrase, not just the category", () => {
    const match = detectEmergency("I can't breathe properly");
    expect(match?.matchedPhrase.toLowerCase()).toContain("breath");
  });
});

describe("buildEmergencyResponse", () => {
  it("is a fixed, non-empty message directing the user to emergency services", () => {
    const text = buildEmergencyResponse();
    expect(text.toLowerCase()).toContain("emergency");
    expect(text).toContain("911");
  });

  it("includes Indian emergency numbers and tells the user not to wait it out", () => {
    const text = buildEmergencyResponse();
    expect(text).toContain("112");
    expect(text).toContain("108");
    expect(text.toLowerCase()).toContain("india");
    expect(text.toLowerCase()).toContain("do not wait");
  });

  it("is deterministic — always returns the exact same text", () => {
    expect(buildEmergencyResponse()).toBe(buildEmergencyResponse());
  });
});
