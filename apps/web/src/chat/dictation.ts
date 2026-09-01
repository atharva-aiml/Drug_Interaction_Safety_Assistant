/** How long a dictation pause must last before it's treated as "done speaking". */
export const DICTATION_PAUSE_MS = 3000;

/**
 * Business rule: a dictated query is considered complete once the user has
 * been silent for DICTATION_PAUSE_MS since the last speech result. Pure, no
 * SpeechRecognition/DOM access — takes plain timestamps so it's unit-testable
 * without a browser's speech API, same shape as shouldAutoScroll.
 */
export function shouldFinalizeDictation(lastSpeechAt: number, now: number, pauseMs: number = DICTATION_PAUSE_MS): boolean {
  return now - lastSpeechAt >= pauseMs;
}
