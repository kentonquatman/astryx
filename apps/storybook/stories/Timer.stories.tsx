// Copyright (c) Meta Platforms, Inc. and affiliates.

import type {Meta, StoryObj} from '@storybook/react';
import {Timer} from '@astryxdesign/core/Timer';
import {Text} from '@astryxdesign/core/Text';

const meta: Meta<typeof Timer> = {
  title: 'Core/Timer',
  component: Timer,
  tags: ['autodocs'],
  argTypes: {
    startTime: {
      control: 'number',
      description: 'Operation start as Unix milliseconds',
    },
    formatElapsedTime: {
      control: false,
      description: 'Plain-text formatter for elapsed whole seconds',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Timer>;

export const Default: Story = {};

export const WaitingMessage: Story = {
  render: () => (
    <Text type="supporting" color="secondary">
      You&apos;ve waited for <Timer /> seconds.
    </Text>
  ),
};

export const MinutesAndSeconds: Story = {
  render: () => (
    <Timer
      aria-label="Elapsed time"
      formatElapsedTime={seconds =>
        `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
      }
    />
  ),
};

export const EarlierStart: Story = {
  render: () => (
    <Timer
      startTime={Date.now() - 65_000}
      formatElapsedTime={seconds => `${seconds} seconds elapsed`}
    />
  ),
};
