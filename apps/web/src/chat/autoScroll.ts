export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/** Within this many pixels of the bottom still counts as "at the bottom". */
const NEAR_BOTTOM_THRESHOLD_PX = 80;

/**
 * Business rule (improvements.md #2.9, Build Plan V2.2.8): the transcript
 * should only auto-scroll to a new message when the user was already near
 * the bottom — if they've scrolled up to re-read an earlier explanation, a
 * new message shouldn't yank them back down. Pure, no DOM access — takes
 * plain numbers so it's unit-testable without a browser.
 */
export function shouldAutoScroll(metrics: ScrollMetrics): boolean {
  const distanceFromBottom = metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight;
  return distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX;
}
