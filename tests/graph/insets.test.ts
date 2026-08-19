/**
 * Camera aiming under chrome. The bug these pin: on a phone the bottom sheet covers
 * ~45% of the canvas, so centring a focused genre at `height / 2` put it behind the
 * sheet — visible in the 2026-08-19 phone screenshots, with `blues` half-hidden at the
 * panel edge.
 */
import { describe, expect, it } from 'vitest';

import { NO_INSETS, reframe, visibleCenter, visibleHeight } from '../../src/graph/insets';

const PHONE = { width: 390, height: 844 };

describe('visibleCenter', () => {
  it('is the geometric centre when nothing covers the canvas', () => {
    expect(visibleCenter(PHONE, NO_INSETS)).toEqual({ x: 195, y: 422 });
  });

  it('moves UP when a bottom sheet covers the lower part', () => {
    // 45vh sheet — the actual mobile layout.
    const centre = visibleCenter(PHONE, { top: 0, bottom: 844 * 0.45 });
    expect(centre.y).toBeCloseTo(232.1, 1);
    expect(centre.y).toBeLessThan(422); // the whole point: not behind the sheet
  });

  it('moves DOWN when a top banner covers the upper part', () => {
    const centre = visibleCenter(PHONE, { top: 200, bottom: 0 });
    expect(centre.y).toBe(522);
  });

  it('sits between both when banner and sheet are open together', () => {
    const centre = visibleCenter(PHONE, { top: 180, bottom: 380 });
    expect(centre.y).toBe(180 + (844 - 180 - 380) / 2);
  });

  it('never leaves the canvas when chrome claims more than the height', () => {
    const centre = visibleCenter(PHONE, { top: 600, bottom: 600 });
    expect(centre).toEqual({ x: 195, y: 422 });
  });

  it('keeps x centred — chrome is only ever top/bottom on mobile', () => {
    expect(visibleCenter(PHONE, { top: 100, bottom: 300 }).x).toBe(195);
  });
});

describe('visibleHeight', () => {
  it('subtracts both insets', () => {
    expect(visibleHeight(PHONE, { top: 100, bottom: 200 })).toBe(544);
  });

  it('never returns zero, so it is safe as a divisor', () => {
    expect(visibleHeight(PHONE, { top: 900, bottom: 900 })).toBe(1);
  });
});

describe('reframe', () => {
  it('shrinks by the ratio of visible heights when the banner opens', () => {
    // Nothing open -> banner covering 200px. The same content must still fit.
    const { scale } = reframe(PHONE, NO_INSETS, { top: 200, bottom: 0 });
    expect(scale).toBeCloseTo((844 - 200) / 844, 5);
    expect(scale).toBeLessThan(1); // smaller, as the brief asks
  });

  it('grows back by exactly the inverse when the banner closes', () => {
    const open = { top: 200, bottom: 0 };
    const opening = reframe(PHONE, NO_INSETS, open);
    const closing = reframe(PHONE, open, NO_INSETS);
    expect(opening.scale * closing.scale).toBeCloseTo(1, 10);
  });

  it('is a no-op when the chrome does not change', () => {
    const insets = { top: 120, bottom: 300 };
    const { scale, fromCenter, toCenter } = reframe(PHONE, insets, insets);
    expect(scale).toBe(1);
    expect(fromCenter).toEqual(toCenter);
  });

  it('reports both centres so the caller can keep the content anchored', () => {
    const { fromCenter, toCenter } = reframe(PHONE, NO_INSETS, { top: 200, bottom: 0 });
    expect(fromCenter.y).toBe(422);
    expect(toCenter.y).toBe(522);
  });
});
