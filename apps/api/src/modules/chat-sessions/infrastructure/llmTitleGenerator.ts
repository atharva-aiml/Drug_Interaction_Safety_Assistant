import { LlmPort } from "../../assistant/application/ports.js";
import { TitleGenerator } from "../application/ports.js";

/**
 * Adapts SD-009's `LlmPort.generateTitle` to the `TitleGenerator` port this
 * module owns (Build Plan V2.3.1) — `chat-sessions` depends only on the
 * port; `assistant` has no knowledge of `chat-sessions`, same one-way shape
 * as `AssistantTurnAnswerer`.
 */
export class LlmTitleGenerator implements TitleGenerator {
  constructor(private llm: LlmPort) {}

  async generateTitle(userMessage: string): Promise<string> {
    return this.llm.generateTitle({ userMessage });
  }
}
