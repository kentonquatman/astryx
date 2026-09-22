// Copyright (c) Meta Platforms, Inc. and affiliates.

'use client';

/**
 * @file Timer.tsx
 * @input Uses an optional start time, plain-text formatter, BaseProps, and React ref
 * @output Exports Timer and TimerProps with non-rendering elapsed-time updates
 * @position Core content primitive for elapsed duration in active operations
 *
 * SYNC: When modified, update these files to stay in sync:
 * - /packages/core/src/Timer/Timer.spec.md
 * - /packages/core/src/Timer/Timer.doc.mjs
 * - /packages/core/src/Timer/Timer.test.tsx
 * - /packages/core/src/Timer/index.ts
 * - /apps/storybook/stories/Timer.stories.tsx
 * - /packages/cli/assets/templates/blocks/components/Timer/
 */

import {useEffect, useRef, useState} from 'react';
import * as stylex from '@stylexjs/stylex';
import type {BaseProps} from '../BaseProps';
import {useMergedRefs} from '../hooks/useMergedRefs';
import {mergeProps} from '../utils';
import {themeProps} from '../utils/themeProps';

const ONE_SECOND_MS = 1000;

const styles = stylex.create({
  root: {
    fontVariantNumeric: 'tabular-nums',
  },
});

function defaultFormatElapsedTime(elapsedSeconds: number): string {
  return String(elapsedSeconds);
}

function getElapsedSeconds(now: number, startTime: number): number {
  return Math.max(0, Math.floor((now - startTime) / ONE_SECOND_MS));
}

function toDuration(elapsedSeconds: number): string {
  return `PT${elapsedSeconds}S`;
}

export interface TimerProps extends Omit<
  BaseProps<HTMLTimeElement>,
  'dateTime'
> {
  /** Ref forwarded to the root `<time>` element. */
  ref?: React.Ref<HTMLTimeElement>;
  /**
   * Unix time in milliseconds when the measured operation began. Omit it to
   * start counting from this Timer's mount.
   */
  startTime?: number;
  /**
   * Formats the non-negative elapsed whole-second value as plain text.
   * @default elapsedSeconds => String(elapsedSeconds)
   */
  formatElapsedTime?: (elapsedSeconds: number) => string;
}

/**
 * Displays elapsed whole seconds without scheduling a React render on each tick.
 *
 * Timer writes changing text and its ISO 8601 duration directly to the owned
 * `<time>` node. Compose it inside surrounding copy or supply
 * `formatElapsedTime` when the duration needs a different text convention.
 *
 * @example
 * ```
 * <Text>
 *   You've waited for <Timer /> seconds.
 * </Text>
 * ```
 */
export function Timer({
  startTime,
  formatElapsedTime = defaultFormatElapsedTime,
  ref,
  xstyle,
  className,
  style,
  ...rest
}: TimerProps) {
  const [mountTime] = useState(() => Date.now());
  const timerRef = useRef<HTMLTimeElement>(null);
  const mergedRef = useMergedRefs(ref, timerRef);
  const initialText = '0';

  useEffect(() => {
    const resolvedStartTime =
      startTime !== undefined && Number.isFinite(startTime)
        ? startTime
        : mountTime;
    let timeoutID: ReturnType<typeof setTimeout> | undefined;
    let previousSeconds: number | undefined;
    let previousText: string | undefined;

    const tick = () => {
      const now = Date.now();
      const elapsedMilliseconds = Math.max(0, now - resolvedStartTime);
      const elapsedSeconds = getElapsedSeconds(now, resolvedStartTime);
      const text = formatElapsedTime(elapsedSeconds);
      const node = timerRef.current;

      if (node != null) {
        if (text !== previousText) {
          node.textContent = text;
          previousText = text;
        }
        if (elapsedSeconds !== previousSeconds) {
          node.dateTime = toDuration(elapsedSeconds);
          previousSeconds = elapsedSeconds;
        }
      }

      const millisecondsUntilNextSecond =
        ONE_SECOND_MS - (elapsedMilliseconds % ONE_SECOND_MS);
      timeoutID = setTimeout(tick, millisecondsUntilNextSecond);
    };

    tick();
    return () => {
      if (timeoutID !== undefined) {
        clearTimeout(timeoutID);
      }
    };
  }, [formatElapsedTime, mountTime, startTime]);

  return (
    <time
      {...rest}
      ref={mergedRef}
      dateTime="PT0S"
      {...mergeProps(
        themeProps('timer'),
        stylex.props(styles.root, xstyle),
        className,
        style,
      )}>
      {initialText}
    </time>
  );
}

Timer.displayName = 'Timer';
