import { config } from "../../../config.js";
import { MedicationExtractorPort } from "../application/ports.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type GroqMessage = { role: "system" | "user"; content: string };

const SYSTEM_PROMPT = `You are a medication-name extractor for a drug-interaction-safety assistant.
You will be given the raw text extracted from a digital prescription PDF. Identify every distinct
medication that has been PRESCRIBED (ignore patient name, doctor name, clinic letterhead, dates,
dosage/frequency instructions, and any other non-drug text).
Use the medication name exactly as it appears in the text — do not correct spelling, normalize
capitalization, or infer a brand/generic equivalent that isn't written there.
Respond with ONLY a JSON object (no markdown, no commentary) with exactly this key:
- "medications": an array of medication name strings (use [] if none are found).`;

/**
 * Real `MedicationExtractorPort` implementation — the only place in this
 * module allowed to call an LLM. Reuses this codebase's one Groq
 * integration pattern (OpenAI-compatible chat endpoint, free-tier key
 * rotation on 429/401/403) rather than introducing a second HTTP client
 * convention — see `assistant/infrastructure/openAiLlmAdapter.ts`, the
 * chatbot's own Groq adapter, for the precedent this mirrors.
 */
export class GroqMedicationExtractor implements MedicationExtractorPort {
  private readonly keys = config.groqApiKeys;
  private keyIndex = 0;

  private async fetchWithRotation(body: Record<string, unknown>): Promise<globalThis.Response> {
    const errors: string[] = [];
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const keyIdx = (this.keyIndex + attempt) % this.keys.length;
      const authHeaderValue = ["Bearer", this.keys[keyIdx]].join(" ");
      let res: globalThis.Response;
      try {
        res = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeaderValue },
          body: JSON.stringify(body),
        });
      } catch (err) {
        errors.push(`key #${keyIdx + 1}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      if (res.status === 429 || res.status === 401 || res.status === 403) {
        errors.push(`key #${keyIdx + 1}: HTTP ${res.status}`);
        this.keyIndex = (keyIdx + 1) % this.keys.length;
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Groq HTTP ${res.status}: ${text.slice(0, 300)}`);
      }
      this.keyIndex = keyIdx;
      return res;
    }
    throw new Error(`All Groq keys failed: ${errors.join("; ")}`);
  }

  async extractMedications(text: string): Promise<string[]> {
    // Groq's context window is generous but not unlimited — a prescription
    // is never long enough to need this, but a stray multi-page scan
    // shouldn't blow the request budget either.
    const truncated = text.slice(0, 12000);

    const messages: GroqMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: truncated },
    ];

    const res = await this.fetchWithRotation({
      model: config.openaiExtractionModel,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = (await res.json())?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content) {
      throw new Error("Groq returned no content");
    }

    const parsed = JSON.parse(content) as { medications?: unknown };
    return Array.isArray(parsed.medications) ? parsed.medications.filter((m): m is string => typeof m === "string") : [];
  }
}
