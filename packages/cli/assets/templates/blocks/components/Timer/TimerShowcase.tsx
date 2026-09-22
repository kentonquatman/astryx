// Copyright (c) Meta Platforms, Inc. and affiliates.

'use client';

import {Timer} from '@astryxdesign/core/Timer';
import {Text} from '@astryxdesign/core/Text';

export default function TimerShowcase() {
  return (
    <Text type="supporting" color="secondary">
      Processing for{' '}
      <Timer formatElapsedTime={seconds => `${seconds} seconds`} />
    </Text>
  );
}
