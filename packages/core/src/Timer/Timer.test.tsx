// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Timer.test.tsx
 * @input Uses React Testing Library, fake clocks, React Profiler, and Timer
 * @output Verifies elapsed behavior, render isolation, resources, semantics, and passthrough
 */

import {Profiler, StrictMode, createRef} from 'react';
import {renderToString} from 'react-dom/server';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Timer} from './Timer';

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders deterministic zero-duration markup before effects advance it', () => {
    render(<Timer data-testid="timer" />);
    const timer = screen.getByTestId('timer');

    expect(timer.tagName).toBe('TIME');
    expect(timer).toHaveTextContent('0');
    expect(timer).toHaveAttribute('datetime', 'PT0S');
  });

  it('keeps server markup independent of the clock and formatter', () => {
    const formatElapsedTime = vi.fn(() => 'formatted');
    const firstMarkup = renderToString(
      <Timer startTime={0} formatElapsedTime={formatElapsedTime} />,
    );

    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const secondMarkup = renderToString(
      <Timer startTime={0} formatElapsedTime={formatElapsedTime} />,
    );

    expect(firstMarkup).toBe(secondMarkup);
    expect(firstMarkup).toContain('dateTime="PT0S"');
    expect(firstMarkup).toContain('>0</time>');
    expect(formatElapsedTime).not.toHaveBeenCalled();
  });

  it('derives whole seconds from the clock without accumulating callback count', () => {
    let scheduledTick: (() => void) | undefined;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(callback => {
      scheduledTick = callback as () => void;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    });

    render(<Timer data-testid="timer" />);

    vi.setSystemTime(new Date('2026-09-22T00:00:08.750Z'));
    act(() => {
      scheduledTick?.();
    });

    const timer = screen.getByTestId('timer');
    expect(timer).toHaveTextContent('8');
    expect(timer).toHaveAttribute('datetime', 'PT8S');
  });

  it('counts from a finite caller-provided start time', () => {
    const now = Date.now();
    render(<Timer startTime={now - 12_400} data-testid="timer" />);

    expect(screen.getByTestId('timer')).toHaveTextContent('12');
    expect(screen.getByTestId('timer')).toHaveAttribute('datetime', 'PT12S');
  });

  it('returns to the original mount origin when startTime is removed', () => {
    const mountedAt = Date.now();
    const {rerender} = render(
      <Timer startTime={mountedAt - 10_000} data-testid="timer" />,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    rerender(<Timer data-testid="timer" />);

    expect(screen.getByTestId('timer')).toHaveTextContent('2');
    expect(screen.getByTestId('timer')).toHaveAttribute('datetime', 'PT2S');
  });

  it('falls back to mount time for a non-finite start time', () => {
    render(<Timer startTime={Number.NaN} data-testid="timer" />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('timer')).toHaveTextContent('2');
  });

  it('clamps an origin in the future to zero', () => {
    render(<Timer startTime={Date.now() + 5000} data-testid="timer" />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('timer')).toHaveTextContent('0');
    expect(screen.getByTestId('timer')).toHaveAttribute('datetime', 'PT0S');
  });

  it('applies a plain-text formatter and updates it without remounting', () => {
    const {rerender} = render(
      <Timer
        formatElapsedTime={seconds => `${seconds}s`}
        data-testid="timer"
      />,
    );
    const timer = screen.getByTestId('timer');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(timer).toHaveTextContent('3s');

    rerender(
      <Timer
        formatElapsedTime={seconds => `${seconds} seconds elapsed`}
        data-testid="timer"
      />,
    );
    expect(screen.getByTestId('timer')).toBe(timer);
    expect(timer).toHaveTextContent('3 seconds elapsed');
  });

  it('does not schedule React update commits as time advances', () => {
    const onRender = vi.fn();
    render(
      <Profiler id="timer" onRender={onRender}>
        <Timer />
      </Profiler>,
    );
    expect(onRender).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onRender).toHaveBeenCalledTimes(1);
  });

  it('owns one timer resource and cleans up under StrictMode replay', () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const {unmount} = render(
      <StrictMode>
        <Timer />
      </StrictMode>,
    );

    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
  });

  it('forwards its ref and preserves standard root props', () => {
    const ref = createRef<HTMLTimeElement>();
    const onClick = vi.fn();
    render(
      <Timer
        ref={ref}
        id="elapsed"
        className="custom-class"
        style={{color: 'rgb(1, 2, 3)'}}
        aria-live="polite"
        onClick={onClick}
        data-testid="timer"
      />,
    );

    const timer = screen.getByTestId('timer');
    expect(ref.current).toBe(timer);
    expect(timer).toHaveAttribute('id', 'elapsed');
    expect(timer.className).toContain('astryx-timer');
    expect(timer.className).toContain('custom-class');
    expect(timer).toHaveStyle({color: 'rgb(1, 2, 3)'});
    expect(timer).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(timer);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not add live-region semantics by default', () => {
    render(<Timer data-testid="timer" />);
    const timer = screen.getByTestId('timer');

    expect(timer).not.toHaveAttribute('aria-live');
    expect(timer).not.toHaveAttribute('role');
  });
});
