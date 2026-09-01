import { ChatMessage } from "@disa/shared-types";
import { LlmPort } from "../../assistant/application/ports.js";
import { HistorySummarizer } from "../application/ports.js";

/**
 * Adapts SD-009's `LlmPort.summarizeHistory` to the `HistorySummarizer` port
 * this module owns (Build Plan V2.3.2) — same one-way adapter shape as
 * `AssistantTurnAnswerer`/`LlmTitleGenerator`.
 */
export class LlmHistorySummarizer implements HistorySummarizer {
  constructor(private llm: LlmPort) {}

  async summarize(existingSummary: string, olderMessages: { role: ChatMessage["role"]; text: string }[]): Promise<string> {
    return this.llm.summarizeHistory({ existingSummary, olderMessages });
  }
}
