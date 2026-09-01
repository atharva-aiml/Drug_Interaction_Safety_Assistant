import { RunTurnDeps, runTurn } from "../../assistant/application/useCases.js";
import { PendingClarification } from "../../assistant/domain/clarificationGuidance.js";
import { TurnAnswerer, TurnResult } from "../application/ports.js";

/**
 * Adapts SD-009's `runTurn` to the `TurnAnswerer` port this module owns.
 * `chat-sessions` depends only on the port; `assistant` has no knowledge of
 * `chat-sessions` at all — the dependency points one way, same shape as any
 * other port/adapter pair in this codebase.
 */
export class AssistantTurnAnswerer implements TurnAnswerer {
  constructor(private deps: RunTurnDeps) {}

  async answer(input: {
    patientId: string;
    text: string;
    history?: { role: "user" | "assistant"; text: string }[];
    intakeComplete: boolean;
    intakeAskCount: number;
    pendingClarifications: PendingClarification[];
    multiPersonNoticeShown: boolean;
    dosageNoticeShown: boolean;
    forceGroundedCheck?: boolean;
    onChunk?: (delta: string) => void;
    signal?: AbortSignal;
  }): Promise<TurnResult> {
    return runTurn(input, this.deps);
  }
}
