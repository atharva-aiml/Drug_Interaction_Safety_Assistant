import { useCallback, useRef } from "react";

/** How long after the last scroll event the scrollbar stays visible before fading out. */
const HIDE_DELAY_MS = 200;

/**
 * Toggles a `scroll-active` class on a scrollable element while it's being
 * scrolled, removing it a short delay after scrolling stops — the CSS
 * scrollbar-thumb transition (styles.css) does the actual fade in/out, this
 * just drives the class. Attach the returned ref to the scrolling element
 * itself (the one with `overflow-y: auto`).
 *
 * A callback ref, not `useRef` + `useEffect([])`: several call sites
 * (`ChatSidebar`'s session list, `ActiveRiskRail`) render their scrollable
 * element conditionally, mounting it well after the initial effect would
 * already have run and found `ref.current` null — an effect with an empty
 * dependency array never gets a second chance to attach once that element
 * finally appears. A callback ref fires exactly when the DOM node changes,
 * including a later null-to-element mount, so it always attaches correctly.
 */
export function useAutoHideScrollbar<T extends HTMLElement>() {
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detachRef = useRef<(() => void) | null>(null);

  const ref = useCallback((el: T | null) => {
    detachRef.current?.();
    detachRef.current = null;
    if (!el) return;

    function handleScroll() {
      el!.classList.add("scroll-active");
      if (hideTimeoutRef.current !== null) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => el!.classList.remove("scroll-active"), HIDE_DELAY_MS);
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    detachRef.current = () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return ref;
}
