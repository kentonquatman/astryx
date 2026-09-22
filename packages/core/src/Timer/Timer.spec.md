---
schema_version: 3
template_version: 5
kind: component
id: component:Timer
authority: current
archive_reason: null
superseded_by: null
approved_by: cixzhang
approved_at: 2026-09-22
owners: [cixzhang]
review_triggers: [public-api, behavior, theming, accessibility, react-runtime]
verified_by:
  [
    packages/core/src/Timer/Timer.test.tsx,
    packages/core/src/theme/themingTargets.test.ts,
    scripts/check-knowledge.mjs,
  ]
modules: []
families: []
design_specs: []
architecture:
  [
    architecture:public-component-api,
    architecture:component-theming-surface,
    architecture:react-component-runtime,
  ]
contributing: []
system_specs: [spec:AST-002/DEC-1, spec:AST-037/DEC-1, spec:AST-037/DEC-2]
---

# Timer component contract

## Contract at a glance

| Area                    | Contract                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public contract         | `Timer`, `TimerProps`, optional `startTime` Unix milliseconds, optional `formatElapsedTime(elapsedSeconds)`, root `HTMLTimeElement` ref, and `BaseProps<HTMLTimeElement>`.   |
| Behavior                | One semantic duration counts elapsed whole seconds and updates its owned DOM node without React tick renders.                                                                |
| End-user impact         | People waiting on active work see accurate elapsed duration without timer updates competing with the surrounding interface.                                                  |
| Builder impact          | Zero-config starts on mount; callers choose only an earlier origin or plain-text format when their use case owns that distinction.                                           |
| Compatibility/readiness | Additive first release implementing current `spec:AST-037`; no existing API or behavior changes.                                                                             |
| Review checks           | Reject state-driven ticks, callback-count drift, leaked resources, negative output, lost passthrough/ref behavior, unsolicited live announcements, or extra anatomy/targets. |
| Governing rules         | `spec:AST-037`; `architecture:public-component-api`; `architecture:react-component-runtime`; `architecture:component-theming-surface`.                                       |

This table is a review projection; the body below is authoritative.

## Intent

Timer is the stable Core projection of `spec:AST-037`. It presents elapsed whole
seconds for an active operation while keeping clock ticks outside React's render
lifecycle.

## Compatibility and migration

- Released default preserved: `not yet released`
- Compatibility class: additive component and type exports
- Controlled/uncontrolled behavior: not applicable
- Migration decision: `spec:AST-037/DEC-1` and `spec:AST-037/DEC-2`

Consumer migration instructions belong in consumer docs and release notes.

## Ownership boundary

**Owns**

- Elapsed whole-second calculation from mount or a finite caller origin.
- One `<time>` root, its visible value, synchronized ISO duration, and timer
  resource lifecycle.
- Avoiding React update commits for clock ticks.
- The `timer` theming target.

**Does not own / non-goals**

- Loading indicators, waiting copy, status, or visibility — product composition.
- Dates, relative calendar language, time zones, or absolute instants — Timestamp.
- Pause, resume, countdown, deadlines, alarms, laps, sub-second precision, or
  caller-controlled scheduling cadence.
- Automatic live-region announcements.

## Public concepts

| Concept        | Closed values or states                    | Meaning                                            | Availability | Default                                    | Owner             | Stability | Invalid-value behavior                    |
| -------------- | ------------------------------------------ | -------------------------------------------------- | ------------ | ------------------------------------------ | ----------------- | --------- | ----------------------------------------- |
| Elapsed origin | Mount time or finite `startTime`           | Unix-millisecond origin for elapsed duration       | Always       | Mount time                                 | `component:Timer` | Stable    | Non-finite values fall back to mount time |
| Elapsed format | Decimal seconds or caller formatter string | Plain-text representation of elapsed whole seconds | Always       | Base-10 integer                            | `component:Timer` | Stable    | Non-string output rejected by types       |
| Root surface   | `<time>` with visible text and `dateTime`  | Semantic elapsed duration and standard BaseProps   | Always       | `0` / `PT0S` before client synchronization | `component:Timer` | Stable    | Timer-owned `dateTime` wins               |

## Behavioral and layout contract

| ID  | Candidate invariant                                                                                                                     | Basis                        | Draft review state |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------ |
| FR1 | Timer MUST render one `<time>` root with formatted elapsed whole-second text and the matching non-negative ISO 8601 duration.           | `spec:AST-037` FR1, FR3, FR5 | Settled            |
| FR2 | Omitted or non-finite `startTime` MUST use the mount origin; a finite value MUST use that caller origin.                                | `spec:AST-037` FR2           | Settled            |
| FR3 | Ticks MUST recompute from the clock and origin, directly update the owned node, and produce zero React update commits.                  | `spec:AST-037` FR3–FR4       | Settled            |
| FR4 | Prop changes MUST take effect without remounting or duplicate resources; every setup MUST clean up its resource.                        | `spec:AST-037` FR6–FR7       | Settled            |
| FR5 | The root MUST preserve the admitted BaseProps DOM, ARIA, event, styling, and React 19 ref surface while keeping `dateTime` Timer-owned. | `spec:AST-037` FR8           | Settled            |
| FR6 | Timer MUST NOT add live-region semantics by default.                                                                                    | `spec:AST-037` FR9           | Settled            |
| FR7 | The visible root MUST carry exactly the `timer` target.                                                                                 | `spec:AST-037` FR10          | Settled            |
| FR8 | Initial markup MUST format zero and set `PT0S` without exposing a clock read in rendered markup.                                        | `spec:AST-037` FR11          | Settled            |

### Allowed variation

- **AV1 — Scheduling.** The private browser scheduling mechanism may change while
  clock derivation, no-render ticks, and complete cleanup remain true.
- **AV2 — Text format.** Callers may return any plain string from
  `formatElapsedTime`.
- **AV3 — Composition.** The root may inherit typography or receive standard
  styling inputs without changing timing behavior.

### Representative states

| State            | Required invariant                                            | Allowed variation                 |
| ---------------- | ------------------------------------------------------------- | --------------------------------- |
| Initial          | Formatted zero and `PT0S` on one `<time>` root                | Root props and styling            |
| Default origin   | Clock-derived whole seconds from mount; no React tick commits | Private scheduler                 |
| Earlier origin   | Complete elapsed duration from caller start                   | Any finite Unix-millisecond value |
| Delayed callback | Catch up to clock without accumulated drift                   | Delay length                      |
| Prop update      | New origin/formatter applies on the same root                 | Parent render cause               |
| Replay/unmount   | Each acquired resource is released                            | Development replay count          |

### Transformation and precedence order

- **ORD1 — Resolve → calculate → clamp → floor → format → write.** Apply the
  pipeline from `spec:AST-037` to visible text and machine-readable duration.
- **ORD2 — Owned semantics last.** Timer owns `dateTime`; other admitted BaseProps
  compose on the root.

### Performance and resources

- **PR1 — No tick renders.** Advancing time produces zero React update commits.
- **PR2 — One resource.** Each mounted Timer owns at most one active timer resource,
  and each setup cleanup releases its resource.
- **PR3 — Bounded writes.** Unchanged formatted text is not rewritten.

## Accessibility contract

- **AR1 — Semantic duration.** The `<time>` root exposes the current non-negative
  ISO 8601 duration through `dateTime`.
- **AR2 — Quiet by default.** No role or `aria-live` value is added automatically;
  deliberate caller ARIA passes through.
- **AR3 — Perceivable text.** The formatted duration remains real text content.

## Design relationships

| Anatomy or state | Design requirement                                               | Representation authority | Hierarchy role | Component contract |
| ---------------- | ---------------------------------------------------------------- | ------------------------ | -------------- | ------------------ |
| Elapsed time     | One stable inline duration that inherits surrounding typography. | `spec:AST-037/DEC-1`     | Supporting     | FR1, FR3, AR1, AR3 |

### Theming anatomy

<!-- anatomy-theming:v1 -->

```json
{
  "Elapsed time": {"target": "timer"}
}
```

## Family and system relationships

- `spec:AST-037` owns the public behavior, API, accessibility, performance, and
  first-Core-admission decisions projected here.
- `architecture:public-component-api` owns exports, BaseProps, styling, ref, and
  caller-choice rules.
- `architecture:react-component-runtime` owns Effect and resource lifecycle.
- `architecture:component-theming-surface` owns target qualification.

## Verification map

| Contract               | Verification                                               | Representative states                                 | Mutation or failure expectation                                                                            | Audit section               |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------- |
| FR1–FR4, FR8, AR1, AR3 | `Timer.test.tsx` controlled-clock tests                    | Initial, default/earlier origin, delay, format change | State ticks, callback accumulation, negative values, stale semantics, or clock-derived initial markup fail | `audit:Timer/behavior`      |
| FR3, PR1               | React Profiler commit-count test                           | Several ticks                                         | A state-based implementation adds update commits and fails                                                 | `audit:Timer/performance`   |
| FR4, PR2               | Resource spies under rerender, StrictMode, and unmount     | Setup, dependency change, replay, cleanup             | Duplicate or leaked resources fail counts                                                                  | `audit:Timer/resources`     |
| FR5                    | Public import and BaseProps/ref tests                      | Import, ref, event, ARIA, class, style                | Missing export or dropped root input fails                                                                 | `audit:Timer/api`           |
| FR6, AR2               | Accessibility attribute tests                              | Default and deliberate caller ARIA                    | Unsolicited live semantics or dropped ARIA fails                                                           | `audit:Timer/accessibility` |
| FR7                    | `themingTargets.test.ts` and `scripts/check-knowledge.mjs` | One root target                                       | Missing, extra, or misplaced target fails                                                                  | `audit:Timer/theming`       |

## Decision log

No additional decision. This component projects `spec:AST-037` without widening it.

## Open questions

None.

## Content boundary

This file does not duplicate consumer examples, implementation code, scheduling
mechanics, measurements, or system rules. It links to their owners.
