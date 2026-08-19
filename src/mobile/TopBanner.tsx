/**
 * Mobile chrome: a button, and a banner across the top when you tap it.
 *
 * Replaces the stacked sidebar, which on a phone had both panels mounted at once and
 * covered the map they were meant to filter — the whole screen was chrome and the graph
 * was invisible behind it. Now the map is the default state and the controls are
 * summoned.
 *
 * The banner MEASURES itself and reports its height, because the canvas underneath is
 * full-bleed: without a real number the camera cannot know how much of itself is
 * covered, and would keep centring genres behind the chrome.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

import SwipeDeck, { type Slide } from './SwipeDeck';

interface TopBannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reports the covered height in CSS pixels — 0 when closed. */
  onHeightChange: (height: number) => void;
  filter: ReactNode;
  personal: ReactNode;
}

export default function TopBanner({
  open,
  onOpenChange,
  onHeightChange,
  filter,
  personal,
}: TopBannerProps) {
  const [slide, setSlide] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Report the covered height whenever it changes. Closed is exactly 0 — the toggle
  // button is small and sits over dead space in the corner, so it is not worth
  // shifting the whole camera for.
  useEffect(() => {
    if (!open) {
      onHeightChange(0);
      return;
    }
    const el = bannerRef.current;
    if (!el) return;
    const report = () => onHeightChange(el.getBoundingClientRect().height);
    report();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, onHeightChange]);

  const slides: Slide[] = [
    { id: 'filter', label: 'Filter', content: filter },
    { id: 'yours', label: 'Your music', content: personal },
  ];

  return (
    <>
      {/*
        Only floats while CLOSED. Open, the close control sits inline with the tabs
        instead — a separate row above them spent vertical space the banner cannot
        afford, and left the tab row looking orphaned.
      */}
      {!open && (
        <button
          type="button"
          className="banner-toggle"
          aria-expanded={false}
          aria-label="Show filters"
          onClick={() => onOpenChange(true)}
        >
          ☰
        </button>
      )}

      {open && (
        <div className="top-banner" ref={bannerRef} role="region" aria-label="Controls">
          <SwipeDeck
            slides={slides}
            index={slide}
            onIndexChange={setSlide}
            className="deck--banner"
            trailing={
              <button
                type="button"
                className="banner-close"
                aria-expanded
                aria-label="Hide filters"
                onClick={() => onOpenChange(false)}
              >
                ×
              </button>
            }
          />
        </div>
      )}
    </>
  );
}
