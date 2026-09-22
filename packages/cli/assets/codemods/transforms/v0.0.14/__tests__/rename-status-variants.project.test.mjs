// Copyright (c) Meta Platforms, Inc. and affiliates.

import {describe, expect, it} from 'vitest';
import transform from '../rename-status-variants.mjs';

function applyProject(sources) {
  const files = Object.entries(sources).map(([name, source]) => ({
    path: `/project/${name}`,
    source,
  }));
  const project = transform.prepare(files);
  return Object.fromEntries(
    files.map(file => [
      file.path.split('/').at(-1),
      transform(file, {
        jscodeshift: null,
        stats() {},
        report() {},
        project,
      }) ?? file.source,
    ]),
  );
}

describe('rename-status-variants project analysis', () => {
  it('preserves an unrelated CellTone in a target-importing file', () => {
    const output = applyProject({
      'view.tsx': `import {StatusDot} from '@astryxdesign/core';
type CellTone = 'positive' | 'negative' | 'info';
const cellTone: CellTone = 'positive';
const status = <StatusDot variant="negative" />;`,
    })['view.tsx'];

    expect(output).toContain("type CellTone = 'positive' | 'negative' | 'info'");
    expect(output).toContain("const cellTone: CellTone = 'positive'");
    expect(output).toContain('variant="error"');
  });

  it('follows cross-file helper returns and helper chains', () => {
    const output = applyProject({
      'tone.ts': `export function base() { return 'positive' as const; }
export function statusTone() { return base(); }`,
      'view.tsx': `import {StatusDot} from '@astryxdesign/core/StatusDot';
import {statusTone} from './tone';
export const view = <StatusDot variant={statusTone()} />;`,
    });

    expect(output['tone.ts']).toContain("return 'success' as const");
    expect(output['view.tsx']).toContain('variant={statusTone()}');
  });

  it('follows a cross-file app wrapper prop, comparison, and type', () => {
    const output = applyProject({
      'wrapper.tsx': `import {StatusDot} from '@astryxdesign/core';
export function Status({tone}: {tone: 'negative' | 'info'}) {
  const urgent = tone === 'negative';
  return <StatusDot variant={tone} />;
}`,
      'app.tsx': `import {Status as State} from './wrapper';
export const app = <State tone="info" />;`,
    });

    expect(output['wrapper.tsx']).toContain("tone: 'error' | 'accent'");
    expect(output['wrapper.tsx']).toContain("tone === 'error'");
    expect(output['app.tsx']).toContain('tone="accent"');
  });

  it('keeps helper arguments context-sensitive', () => {
    const output = applyProject({
      'view.tsx': `import {StatusDot} from '@astryxdesign/core';
function identity(value: string) { return value; }
const target = <StatusDot variant={identity('positive')} />;
const unrelated = identity('positive');`,
    })['view.tsx'];

    expect(output).toContain("identity('success')");
    expect(output).toContain("const unrelated = identity('positive')");
  });

  it('keeps Badge info distinct while migrating its positive/negative values', () => {
    const output = applyProject({
      'badge.tsx': `import {Badge} from '@xds/core/Badge';
const info = 'info' as const;
const good = 'positive' as const;
export const view = <><Badge variant={info} /><Badge variant={good} /></>;`,
    })['badge.tsx'];

    expect(output).toContain("const info = 'info' as const");
    expect(output).toContain("const good = 'success' as const");
  });

  it('fails closed when one value feeds StatusDot and Badge info contracts', () => {
    expect(() =>
      applyProject({
        'mixed.tsx': `import {StatusDot, Badge} from '@astryxdesign/core';
const tone = 'info' as const;
export const view = <><StatusDot variant={tone} /><Badge variant={tone} /></>;`,
      }),
    ).toThrow(/incompatible component contracts/);
  });

  it('honors imported aliases and ignores a shadowing local component', () => {
    const output = applyProject({
      'alias.tsx': `import {StatusDot as Dot} from '@xds/core';
const migrated = <Dot variant="positive" />;
function Local(Dot: (props: {variant: string}) => unknown) {
  return <Dot variant="negative" />;
}`,
    })['alias.tsx'];

    expect(output).toContain('variant="success"');
    expect(output).toContain('variant="negative"');
  });
});
