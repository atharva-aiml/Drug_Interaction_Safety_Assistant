import { describe, expect, it } from "vitest";
import { buildOffTopicResponse, isLikelyOffTopic } from "./topicRelevance.js";

describe("isLikelyOffTopic", () => {
  it("flags clearly unrelated general-knowledge questions", () => {
    expect(isLikelyOffTopic("who is the prime minister of India")).toBe(true);
    expect(isLikelyOffTopic("give me a code for binary search")).toBe(true);
    expect(isLikelyOffTopic("what's the weather like today")).toBe(true);
    expect(isLikelyOffTopic("tell me a joke")).toBe(true);
  });

  it("does not flag messages naming medications, symptoms, or health topics", () => {
    expect(isLikelyOffTopic("I am taking aspirin and warfarin, any risks?")).toBe(false);
    expect(isLikelyOffTopic("I have a headache and feel dizzy")).toBe(false);
    expect(isLikelyOffTopic("what is a blood thinner?")).toBe(false);
    expect(isLikelyOffTopic("I'm allergic to penicillin")).toBe(false);
    expect(isLikelyOffTopic("will this medication make me drowsy?")).toBe(false);
  });

  it("does not flag a bare catalog drug/allergen/condition name given as context", () => {
    expect(isLikelyOffTopic("Ibuprofen", ["Ibuprofen", "Peanuts"])).toBe(false);
    expect(isLikelyOffTopic("ibuprofen", ["Ibuprofen"])).toBe(false);
  });

  it("does not flag greetings, acknowledgements, or very short replies", () => {
    expect(isLikelyOffTopic("hi")).toBe(false);
    expect(isLikelyOffTopic("hello")).toBe(false);
    expect(isLikelyOffTopic("yes")).toBe(false);
    expect(isLikelyOffTopic("no")).toBe(false);
    expect(isLikelyOffTopic("thanks")).toBe(false);
    expect(isLikelyOffTopic("ok")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isLikelyOffTopic("WHO IS THE PRIME MINISTER OF INDIA")).toBe(true);
    expect(isLikelyOffTopic("I HAVE A HEADACHE")).toBe(false);
  });
});

describe("buildOffTopicResponse", () => {
  it("is a fixed, non-empty redirect message", () => {
    const text = buildOffTopicResponse();
    expect(text.toLowerCase()).toContain("health");
    expect(text.toLowerCase()).toContain("drug interactions");
  });

  it("is deterministic — always returns the exact same text", () => {
    expect(buildOffTopicResponse()).toBe(buildOffTopicResponse());
  });
});
