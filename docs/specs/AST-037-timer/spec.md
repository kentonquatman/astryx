---
schema_version: 1
template_version: 1
kind: system-spec
id: spec:AST-037
authority: current
archive_reason: null
superseded_by: null
approved_by: cixzhang
approved_at: 2026-09-22
phase: accepted
owners: [cixzhang]
affects_architecture:
  [
    architecture:public-component-api,
    architecture:component-theming-surface,
    architecture:react-component-runtime,
  ]
affects_families: []
affects_contributing: []
affects_consumer_docs: [Timer]
---

# Non-rendering elapsed Timer system spec

## Contract at a glance

| Area            | Contract                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public contract | Add `Timer`, `TimerProps`, optional `startTime` in Unix milliseconds, optional `formatElapsedTime(elapsedSeconds)`, the root `HTMLTimeElement` ref, and the standard `BaseProps<HTMLTimeElement>` surface.                                                                                                                      |
| Behavior        | Render elapsed whole seconds from the chosen origin and update the owned `<time>` node without scheduling React renders for ticks.                                                                                                                                                                                              |
| End-user impact | People waiting on an active operation see an accurate elapsed duration while the surrounding interface remains responsive, including when many timers are mounted.                                                                                                                                                              |
| Builder impact  | Builders may use the zero-config mount timer, supply an earlier operation start, or format the elapsed whole-second value as plain text.                                                                                                                                                                                        |
| Compatibility   | Additive, not yet released. Runtime, accessibility, documentation, and theming evidence must land before release.                                                                                                                                                                                                               |
| Review checks   | Reject React state updates for ticks, drift from counting interval callbacks, leaked timers, negative elapsed output, non-text formatter results, lost root passthrough/ref behavior, or more than one visible anatomy part.                                                                                                    |
| Governing rules | [`architecture:public-component-api`](../../architecture/public-component-api.md); [`architecture:react-component-runtime`](../../architecture/react-component-runtime.md); [`architecture:component-theming-surface`](../../architecture/component-theming-surface.md); [AST-002 DEC-1, DEC-2, and DEC-5](../AST-002/spec.md). |

This table is a review projection; the body below is authoritative.

## Intent

Products need a shared elapsed-time primitive for operations whose duration
changes while visible. Its defining value is ownership of a clock-driven DOM
update that does not schedule a React render on each tick. This keeps repeated or
nested timers from broadcasting periodic rendering work through application trees.

Timer is distinct from Timestamp: Timestamp describes an instant and may present
relative calendar language, while Timer measures duration from an origin and emits
elapsed whole seconds. It is also distinct from Text: Text presents caller-owned
content, while Timer owns the changing duration value and its resource lifecycle.

### Component ledger

| Source requirement                                                          | Proposed target                | Why it belongs                                                                                                                                               | Done criteria                                                                                                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Show elapsed time during an active wait without periodic React render work. | Stable Core `Timer` component. | The behavior is reusable across loading, processing, and activity surfaces; products should not rebuild timer lifecycle and drift handling at each callsite. | Public API, direct owned-node updates, clock-derived seconds, cleanup, ref and passthrough behavior, theming target, consumer docs, story, and focused tests all conform to this contract. |

## Ownership boundary

AST-037 owns Timer's public elapsed-origin and formatting concepts, whole-second
clock behavior, non-rendering tick requirement, semantic duration output,
resource lifecycle, and initial Core admission. The Timer component record will
own the concrete component projection and evidence after implementation.
`architecture:public-component-api` owns export, BaseProps, styling, ref, and
caller-choice rules. `architecture:react-component-runtime` owns Effect and
resource lifecycle correctness. `architecture:component-theming-surface` owns
target qualification.

## Non-goals

- Loading indicators, waiting messages, status labels, or when a product chooses to
  show or hide elapsed time.
- Wall-clock dates, relative calendar phrases, time zones, or absolute instants.
- Pause, resume, countdown, deadlines, alarms, lap history, or imperative timer
  controls.
- Sub-second display precision or caller control of the internal scheduling cadence.
- Announcing every tick to assistive technology.
- A new global token or component-specific theme variable.

## Public concepts

| Concept           | Closed values or states                                                 | Meaning                                                                   | Default                               | Invalid-value behavior                                                         |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| Elapsed origin    | Mount time or `startTime` Unix milliseconds                             | The instant from which elapsed whole seconds are derived                  | Mount time                            | A non-finite value falls back to mount time                                    |
| Elapsed format    | Decimal whole seconds or `formatElapsedTime(elapsedSeconds)` plain text | The visible representation of the non-negative elapsed whole-second value | Base-10 integer text                  | A formatter error remains caller-owned; non-string output is rejected by types |
| Tick presentation | Current elapsed value on one `<time>` root                              | Visible text and machine-readable duration                                | `0` before the client resource starts | Clock values before the origin clamp to zero                                   |

`startTime` is caller-owned because Timer cannot derive when an operation began
before Timer mounted. `formatElapsedTime` is caller-owned because products may need
different textual duration conventions while Timer retains one clock and lifecycle
owner. Scheduling cadence remains private because callers do not own it.

## Requirements

- **FR1 — One semantic root.** Timer MUST render one `<time>` root whose visible
  text is the elapsed whole-second value formatted as plain text.
- **FR2 — Derivable origin default.** With no `startTime`, elapsed time MUST begin
  from the component's mount lifetime. With a finite `startTime`, elapsed time MUST
  derive from that Unix-millisecond origin.
- **FR3 — Clock-derived, non-negative seconds.** Timer MUST subtract the resolved
  origin from the current clock, clamp negative duration to zero, and floor to whole
  seconds. It MUST NOT accumulate elapsed time from the number of callbacks that
  fired, so delayed callbacks catch up without cumulative drift.
- **FR4 — No tick renders.** Clock ticks MUST update the owned `<time>` node
  directly and MUST produce zero React update commits for Timer and its surrounding
  subtree. Parent renders caused by unrelated work remain outside Timer's control.
- **FR5 — Machine-readable parity.** Timer MUST update the `<time>` element's
  `dateTime` to the ISO 8601 duration for the same non-negative whole-second value
  represented by visible text.
- **FR6 — Current props without duplicate resources.** A changed `startTime` or
  `formatElapsedTime` MUST take effect without remounting and without creating more
  than one active timer resource.
- **FR7 — Complete lifecycle ownership.** Each mounted Timer owns at most one
  active browser timer resource. Every Effect setup MUST release the resource it
  acquired during dependency change, node replacement, unmount, and StrictMode
  replay. No tick may update a detached or replaced node.
- **FR8 — Stable public DOM surface.** The root MUST expose `Timer`, `TimerProps`,
  its `HTMLTimeElement` ref, and the standard DOM, data, ARIA, style, class, event,
  and `xstyle` inputs admitted by `BaseProps<HTMLTimeElement>`.
- **FR9 — No unsolicited live announcements.** Timer MUST NOT add a live-region
  role or `aria-live` value by default. A caller may deliberately provide an ARIA
  attribute through the standard DOM surface for a context that needs it.
- **FR10 — One themeable anatomy part.** The visible root MUST carry the `timer`
  theming target. No subpart, timing state, or scheduling mechanism receives a
  separate target.
- **FR11 — Initial render is deterministic.** Initial rendered markup MUST show
  `0` with `dateTime="PT0S"` without reading the client clock into server-visible
  markup. Client synchronization then applies the chosen origin and formatter.
- **FR12 — Bounded DOM writes.** Timer SHOULD skip visible-text writes when the
  formatted string has not changed. Machine-readable duration MUST remain
  synchronized whenever the whole-second value changes.

### Transformation and precedence

Resolve the finite caller origin or mount origin, subtract it from the current
clock, clamp to zero, floor to whole seconds, format the value, then update visible
and machine-readable output on the same owned node. Timer owns `dateTime`; standard
consumer attributes and styling otherwise reach the root.

### Platform support

- Supported feature/engine floor: unchanged from the current Core package support.
- Unsupported behavior: environments without Effects retain deterministic `0` /
  `PT0S` markup and acquire no timer resource.
- Browser evidence: a real-browser story verifies visible progression, stable
  inline geometry, semantic duration parity, and absence of component update commits.

## Current-state impact

- Core gains one stable elapsed-duration component and type, one `timer` theming
  target, consumer documentation, Storybook coverage, and a showcase block.
- Timestamp remains unchanged and continues to own instants, calendar-relative
  language, time zones, and absolute formatting.
- The default path adds no builder choice. Only operations that began before mount
  supply `startTime`; only products requiring a different plain-text convention
  supply `formatElapsedTime`.
- No existing component, export, DOM structure, theme, token, or callsite changes.

## Verification

| Contract           | Verification                                                        | Representative states                                                    | Mutation or failure expectation                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR1–FR5, FR11–FR12 | Focused Timer tests with a controlled clock and fake timers         | Initial, default origin, earlier origin, delayed callback, custom format | State-driven ticks, callback-count accumulation, negative values, stale `dateTime`, clock-derived initial markup, or redundant text writes fail focused assertions |
| FR4                | React Profiler commit-count test                                    | Several elapsed ticks and a composed sibling                             | Replacing owned-node mutation with React state produces extra update commits                                                                                       |
| FR6–FR7            | Resource spy tests under rerender, unmount, and StrictMode          | Origin change, formatter change, replay, cleanup                         | Duplicate or leaked timer resources fail setup/cleanup counts and detached-node guards                                                                             |
| FR8                | Public import, DOM passthrough, styling merge, event, and ref tests | Root import and representative BaseProps                                 | Missing exports or dropped attributes, handlers, class/style inputs, or root ref fail                                                                              |
| FR9                | Accessibility attribute tests                                       | Default and caller-declared live behavior                                | Timer adds unsolicited live semantics or drops deliberate caller ARIA                                                                                              |
| FR10               | Theming-target and knowledge checks                                 | One root target                                                          | Missing, extra, or misplaced target mapping fails repository validation                                                                                            |
| Browser contract   | Storybook browser evidence                                          | Default, earlier origin, custom formatter, composed wait message         | Visible output, semantic duration, geometry, or update-commit behavior differs from the contract                                                                   |

## Decision log

### DEC-1 — Timer owns non-rendering elapsed-time updates

**Reference:** `spec:AST-037/DEC-1`  
**Direction owner:** `cixzhang`, `2026-09-22`

Timer is a stable shared primitive for elapsed time. It owns one clock-derived,
whole-second duration and writes changing text directly to its owned DOM node so
clock ticks do not schedule React renders. Builders may supply an earlier start
instant or a plain-text formatter; they do not control internal scheduling.

Rejected: implementing each tick through React state. That makes every Timer a
periodic render source and increases contention in trees already processing live
application updates.

Rejected: exposing the interval or tick frequency. Those are implementation
mechanics, not caller-owned semantic intent.

### DEC-2 — Timer starts in Core

**Reference:** `spec:AST-037/DEC-2`  
**Direction owner:** `cixzhang`, `2026-09-22`

Timer starts in Core because its purpose is a stable cross-product runtime
primitive, its first contract is intentionally narrow, and the requested behavior
is already operationally proven. Core admission requires the complete evidence in
this spec before release; it does not waive normal component quality gates.

Rejected: shipping independent product copies or making the non-rendering behavior
an application recipe. That would duplicate resource ownership and allow the exact
performance property to drift across callsites.

## Open questions

None. The contract is current; implementation evidence remains pending.

## Content boundary

This record does not duplicate consumer examples, implementation code, private
scheduling mechanics, current measurements, or system runtime/theming rules. Those
belong to their canonical owners.
