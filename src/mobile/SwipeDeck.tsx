/**
 * A horizontal deck of slides driven by touch, shared by the top banner and the bottom
 * sheet. Rendering only — the gesture rule lives in `slides.ts` and is unit-tested.
 *
 * Track-and-transform rather than CSS scroll-snap: the deck has to be *told* which
 * slide to show (picking a genre jumps the sheet back to the first slide), and driving
 * scroll position imperatively fights the browser's own momentum. A transform is
 * declarative and animates for free.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { slideAfterSwipe } from './slides';

export interface Slide {
  /** Stable key, also the dot's accessible name. */
  id: string;
  label: string;
  content: ReactNode;
}

interface SwipeDeckProps {
  slides: readonly Slide[];
  index: number;
  onIndexChange: (index: number) => void;
  className?: string;
  /** Labelled tabs above the slides. Off for the banner, which has few slides. */
  showTabs?: boolean;
  /**
   * Control pinned to the end of the tab row. The banner puts its close button here
   * rather than floating it above, which cost a whole row of a screen that has none
   * to spare.
   */
  trailing?: ReactNode;
}

export default function SwipeDeck({
  slides,
  index,
  onIndexChange,
  className,
  showTabs = true,
  trailing,
}: SwipeDeckProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  /**
   * The track is a flex row, so every slide is as tall as the TALLEST one — which
   * left a band of dead space under the short Filter slide, sized by the taller
   * ListenBrainz form. Measuring the ACTIVE slide and driving the viewport height
   * from it gives each slide only the room it needs.
   */
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);

  const safeIndex = Math.max(0, Math.min(index, Math.max(0, slides.length - 1)));

  useEffect(() => {
    const el = slideRefs.current[safeIndex];
    if (!el) return;
    const measure = () => setViewportHeight(el.scrollHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    // Content inside a slide can change height on its own — searching filters the
    // list, linking an account replaces the form with genres.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [safeIndex, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className={className ? `deck ${className}` : 'deck'}>
      {showTabs && slides.length > 1 && (
        <div className="deck-tabs" role="tablist">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              className={i === safeIndex ? 'deck-tab deck-tab--on' : 'deck-tab'}
              onClick={() => onIndexChange(i)}
            >
              {slide.label}
            </button>
          ))}
          {trailing !== undefined && <span className="deck-tabs-end">{trailing}</span>}
        </div>
      )}

      <div
        className="deck-viewport"
        style={viewportHeight === undefined ? undefined : { height: viewportHeight }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          start.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchMove={(event) => {
          if (!start.current) return;
          const touch = event.touches[0];
          const dx = touch.clientX - start.current.x;
          const dy = touch.clientY - start.current.y;
          // Only take over the gesture once it is clearly horizontal, so vertical
          // scrolling inside a slide keeps working.
          if (Math.abs(dx) > Math.abs(dy)) setDragX(dx);
        }}
        onTouchEnd={(event) => {
          if (!start.current) return;
          const touch = event.changedTouches[0];
          const next = slideAfterSwipe(
            safeIndex,
            slides.length,
            touch.clientX - start.current.x,
            touch.clientY - start.current.y,
          );
          start.current = null;
          setDragX(0);
          if (next !== safeIndex) onIndexChange(next);
        }}
      >
        <div
          className="deck-track"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(calc(${(-safeIndex * 100) / slides.length}% + ${dragX}px))`,
            transition: dragX === 0 ? 'transform 220ms ease' : 'none',
          }}
        >
          {slides.map((slide, i) => (
            <section
              key={slide.id}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="deck-slide"
              style={{ width: `${100 / slides.length}%` }}
              aria-hidden={i !== safeIndex}
            >
              {slide.content}
            </section>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="deck-dots" aria-hidden="true">
          {slides.map((slide, i) => (
            <span
              key={slide.id}
              className={i === safeIndex ? 'deck-dot deck-dot--on' : 'deck-dot'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
