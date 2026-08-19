/**
 * Mobile chrome, as an integration test.
 *
 * These exist because of a regression that unit tests could not have caught. Opening
 * the banner used to collapse the sheet via a CSS rule
 * (`.app--mobile:has(.top-banner) .detail .deck`) that referenced `.deck` — a class
 * the sheet stopped using when its swipe deck was replaced with plain tabs. Nothing
 * failed: the selector simply stopped matching, and the `max-height: none` beside it
 * then let the sheet grow to FULL height, the exact opposite of its purpose. It took a
 * phone screenshot to notice.
 *
 * The lesson is that the coupling was invisible to every tool in the project — a class
 * name in a stylesheet paired with a `className` string in JSX is not an import, a call
 * or a type, so neither `tsc` nor the knowledge graph can see it (verified: `styles.css`
 * contributes zero nodes to `graphify-out/graph.json`). The durable fix was to stop
 * expressing the state twice, and these tests hold that line: the chrome states are
 * asserted through the DOM the app actually renders.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from '../../src/App';
import { DATASET } from '../fixtures';

/** jsdom ships no matchMedia; the mobile layout is chosen by it. */
function mockViewport(isMobile: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: isMobile,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

const detail = () => document.querySelector('.detail');

describe('mobile chrome', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve({ ok: true, status: 200, json: async () => DATASET } as Response),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens with the map uncovered — no banner, only the toggle', async () => {
    mockViewport(true);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('graph-canvas')).toBeInTheDocument());
    expect(document.querySelector('.top-banner')).toBeNull();
    expect(document.querySelector('.banner-toggle')).not.toBeNull();
    // The desktop sidebar must not be mounted at all, not merely hidden.
    expect(document.querySelector('.filters')).toBeNull();
  });

  it('swaps the floating toggle for an inline close when the banner opens', async () => {
    mockViewport(true);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('graph-canvas')).toBeInTheDocument());
    fireEvent.click(document.querySelector('.banner-toggle')!);
    expect(document.querySelector('.top-banner')).not.toBeNull();
    // Both at once would be the two-row layout that wasted a band of the screen.
    expect(document.querySelector('.banner-toggle')).toBeNull();
    expect(document.querySelector('.banner-close')).not.toBeNull();
  });

  it('collapses the sheet while the banner is open — THE regression', async () => {
    mockViewport(true);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('graph-canvas')).toBeInTheDocument());

    expect(detail()?.className).not.toContain('detail--collapsed');
    fireEvent.click(document.querySelector('.banner-toggle')!);
    expect(detail()?.className).toContain('detail--collapsed');
    fireEvent.click(document.querySelector('.banner-close')!);
    expect(detail()?.className).not.toContain('detail--collapsed');
  });

  it('keeps the desktop sidebar and mounts no mobile chrome above the breakpoint', async () => {
    mockViewport(false);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('graph-canvas')).toBeInTheDocument());
    expect(document.querySelector('.filters')).not.toBeNull();
    expect(document.querySelector('.banner-toggle')).toBeNull();
    expect(document.querySelector('.top-banner')).toBeNull();
    // The sheet must never carry mobile-only state on desktop.
    expect(detail()?.className).not.toContain('detail--collapsed');
  });
});
