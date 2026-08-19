/**
 * Is the layout in its mobile arrangement?
 *
 * Reads the SAME breakpoint the stylesheet uses (`900px`), because the two must agree:
 * the mobile chrome is not just styled differently, it is a different component tree —
 * a top banner with slides rather than a stacked sidebar — and the camera needs to know
 * how much of the canvas that chrome covers. A CSS-only breakpoint could not tell it.
 *
 * `matchMedia` rather than a resize listener so the callback fires once when the
 * threshold is crossed instead of on every pixel of a drag.
 */
import { useEffect, useState } from 'react';

/** Kept in step with the `@media (max-width: 900px)` block in `styles.css`. */
export const MOBILE_QUERY = '(max-width: 900px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? false
      : window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    // jsdom implements matchMedia only when the test sets it up; degrade to desktop
    // rather than throwing, so component tests need no polyfill to mount.
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(MOBILE_QUERY);
    const update = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    // No eager set here: the useState initialiser already read the same query, so
    // repeating it only cascades a render.
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}
