// Copyright (c) Meta Platforms, Inc. and affiliates.

/** @type {import('@astryxdesign/cli/authoring').ComponentAnatomyElement[]} */
const anatomy = [
  {
    name: 'Elapsed time',
    required: true,
    description:
      'Semantic time element containing the current elapsed duration as plain text.',
  },
];

/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export const docs = {
  name: 'Timer',
  displayName: 'Timer',
  category: 'Content',
  keywords: [
    'timer',
    'elapsed',
    'duration',
    'seconds',
    'stopwatch',
    'waiting',
    'loading',
    'processing',
  ],
  props: [
    {
      name: 'startTime',
      type: 'number',
      description:
        "Unix time in milliseconds when the measured operation began. Omit it to start from this Timer's mount.",
    },
    {
      name: 'formatElapsedTime',
      type: '(elapsedSeconds: number) => string',
      description:
        'Formats the non-negative elapsed whole-second value as plain text.',
      default: 'elapsedSeconds => String(elapsedSeconds)',
    },
    {
      name: 'xstyle',
      type: 'StyleXStyles',
      description:
        'StyleX styles for the root time element. Must be a stylex.create() value.',
    },
    {
      name: 'className',
      type: 'string',
      description:
        'CSS class name for the root time element. Prefer xstyle for styling.',
    },
    {
      name: 'style',
      type: 'CSSProperties',
      description:
        'Inline styles for the root time element. Prefer xstyle for styling.',
    },
  ],
  examples: [
    {
      label: 'Elapsed seconds in a waiting message',
      code: "<Text>You've waited for <Timer /> seconds.</Text>",
    },
    {
      label: 'Operation that started before mount',
      code: '<Timer startTime={operationStartedAt} />',
    },
    {
      label: 'Minutes and seconds',
      code: `<Timer
  formatElapsedTime={seconds =>
    \`${'${Math.floor(seconds / 60)}'}:${"${String(seconds % 60).padStart(2, '0')}"}\`
  }
/>`,
    },
  ],
  theming: {
    targets: [{className: 'astryx-timer'}],
  },
  usage: {
    anatomy,
    description:
      'Displays elapsed whole seconds for an active operation without scheduling a React render on every tick.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Compose Timer into waiting or processing copy when seeing elapsed duration helps a person understand that work is still active.',
      },
      {
        guidance: true,
        description:
          'Pass startTime when the operation began before Timer mounted so the display reflects the complete wait.',
      },
      {
        guidance: true,
        description:
          'Use formatElapsedTime for plain-text duration conventions such as mm:ss; keep loading labels and status UI outside Timer.',
      },
      {
        guidance: false,
        description:
          'Do not use Timer for dates, time zones, or relative calendar language; use Timestamp instead.',
      },
      {
        guidance: false,
        description:
          'Do not add aria-live unless hearing an announcement every second is appropriate for the specific task.',
      },
    ],
  },
};

/** @type {import('@astryxdesign/cli/authoring').ComponentTranslationDoc} */
export const docsDense = {
  description:
    'Elapsed whole-second duration with clock-derived, non-rendering DOM updates.',
  propDescriptions: {
    startTime:
      "operation start as Unix milliseconds; omit to count from Timer's mount",
    formatElapsedTime: 'plain-text formatter for elapsed whole seconds',
    xstyle: 'StyleX styles for the root time element',
    className: 'CSS class for the root time element',
    style: 'inline styles for the root time element',
  },
  usage: {
    anatomy,
    description:
      'Use for active-operation elapsed time when periodic React renders would add avoidable work.',
    bestPractices: [
      {
        guidance: true,
        description: 'Compose inside waiting or processing copy.',
      },
      {
        guidance: true,
        description: 'Pass startTime for work that began before mount.',
      },
      {
        guidance: false,
        description: 'Use Timestamp for dates and relative calendar language.',
      },
    ],
  },
};
