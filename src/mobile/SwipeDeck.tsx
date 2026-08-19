/**
 * A horizontal deck of slides driven by touch, shared by the top banner and the bottom
 * sheet. Rendering only — the gesture rule lives in `slides.ts` and is unit-tested.
 *
 * Track-and-transform rather than CSS scroll-snap: the deck has to be *told* which
 * slide to show (picking a genre jumps the sheet back to the first slide), and driving
 * scroll position imperatively fights the browser's own momentum. A transform is
 * declarative and animates for free.
 */
import { useRef, useState, type ReactNode } from 'react';

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
}

export default function SwipeDeck({
  slides,
  index,
  onIndexChange,
  className,
  showTabs = true,
}: SwipeDeckProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);

  if (slides.length === 0) return null;
  const safeIndex = Math.max(0, Math.min(index, slides.length - 1));

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
        </div>
      )}

      <div
        className="deck-viewport"
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
