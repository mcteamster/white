import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAnimatedCounter } from './animation';

// jsdom provides requestAnimationFrame/cancelAnimationFrame stubs but they
// don't fire automatically in tests. We use vitest fake timers + rAF mocking.

describe('createAnimatedCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Synchronously flush requestAnimationFrame callbacks by replacing it
    // with a version that immediately calls the callback.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('calls onUpdate with the target value when setTarget is called', () => {
    const updates: number[] = [];
    const counter = createAnimatedCounter((v) => updates.push(v));

    counter.setTarget(10);

    expect(updates.length).toBeGreaterThan(0);
    expect(updates[updates.length - 1]).toBe(10);
  });

  it('increments in steps of the provided increment', () => {
    const updates: number[] = [];
    const counter = createAnimatedCounter((v) => updates.push(v), 3);

    counter.setTarget(9);

    // With increment=3, steps should be 3, 6, 9
    expect(updates).toContain(3);
    expect(updates).toContain(6);
    expect(updates).toContain(9);
  });

  it('uses default increment of 5 when not specified', () => {
    const updates: number[] = [];
    const counter = createAnimatedCounter((v) => updates.push(v));

    counter.setTarget(15);

    expect(updates).toContain(5);
    expect(updates).toContain(10);
    expect(updates).toContain(15);
  });

  it('calls onUpdate at least once with the final target', () => {
    const updates: number[] = [];
    const counter = createAnimatedCounter((v) => updates.push(v), 100);

    counter.setTarget(50);

    expect(updates[updates.length - 1]).toBe(50);
  });

  it('does not overshoot the target', () => {
    const updates: number[] = [];
    const counter = createAnimatedCounter((v) => updates.push(v), 7);

    counter.setTarget(10);

    for (const v of updates) {
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('stop() calls cancelAnimationFrame when animation is in flight', () => {
    // Use a rAF stub that returns a truthy ID but does NOT call the callback
    // immediately — leaves the animation pending so animationFrame is set.
    vi.stubGlobal('requestAnimationFrame', () => 42);

    const counter = createAnimatedCounter(() => {});
    counter.setTarget(1000); // large target — won't complete in one queued frame
    counter.stop();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it('does not call onUpdate when target is 0', () => {
    const updates: number[] = [];
    const counter = createAnimatedCounter((v) => updates.push(v));

    counter.setTarget(0);

    expect(updates.length).toBe(0);
  });
});
