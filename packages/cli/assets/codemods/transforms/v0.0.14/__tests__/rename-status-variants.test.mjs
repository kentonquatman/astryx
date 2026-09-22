// Copyright (c) Meta Platforms, Inc. and affiliates.

import {describe, it, expect} from 'vitest';

async function applyTransform(source) {
  const {default: transform} = await import(
    '../rename-status-variants.mjs'
  );
  const jscodeshift = (await import('jscodeshift')).default;
  const j = jscodeshift.withParser('tsx');
  const api = {jscodeshift: j, stats: () => {}, report: () => {}};
  const hasCoreImport = /from ['"]@(xds|astryxdesign)\/core/.test(source);
  const projectSource = hasCoreImport
    ? source
    : `import {XDSStatusDot, XDSAvatarStatusDot, XDSIcon, XDSProgressBar} from '@xds/core';\n${source}`;
  const file = {source: projectSource, path: 'test.tsx'};
  const result = transform(file, api);
  return result ?? projectSource;
}

describe('rename-status-variants', () => {
  it('renames StatusDot variant="positive" to "success"', async () => {
    const input = `<XDSStatusDot variant="positive" label="Online" />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]success['"]/);
    expect(output).not.toMatch(/['"]positive['"]/);
  });

  it('renames StatusDot variant="negative" to "error"', async () => {
    const input = `<XDSStatusDot variant="negative" label="Offline" />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]error['"]/);
    expect(output).not.toMatch(/['"]negative['"]/);
  });

  it('renames StatusDot variant="info" to "accent"', async () => {
    const input = `<XDSStatusDot variant="info" label="Info" />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]accent['"]/);
    expect(output).not.toMatch(/['"]info['"]/);
  });

  it('renames AvatarStatusDot variant="positive" to "success"', async () => {
    const input = `<XDSAvatarStatusDot variant="positive" label="Online" />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]success['"]/);
    expect(output).not.toMatch(/['"]positive['"]/);
  });

  it('renames Icon color="positive" to "success"', async () => {
    const input = `<XDSIcon color="positive" icon={CheckIcon} />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]success['"]/);
    expect(output).not.toMatch(/['"]positive['"]/);
  });

  it('renames Icon color="negative" to "error"', async () => {
    const input = `<XDSIcon color="negative" icon={XIcon} />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]error['"]/);
    expect(output).not.toMatch(/['"]negative['"]/);
  });

  it('renames ProgressBar variant="positive" to "success"', async () => {
    const input = `<XDSProgressBar variant="positive" value={50} />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]success['"]/);
    expect(output).not.toMatch(/['"]positive['"]/);
  });

  it('renames ProgressBar variant="negative" to "error"', async () => {
    const input = `<XDSProgressBar variant="negative" value={50} />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]error['"]/);
    expect(output).not.toMatch(/['"]negative['"]/);
  });

  it('handles expression container: variant={"positive"}', async () => {
    const input = `<XDSStatusDot variant={'positive'} label="Online" />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]success['"]/);
    expect(output).not.toMatch(/['"]positive['"]/);
  });

  it('handles ternary: variant={x ? "positive" : "negative"}', async () => {
    const input = `<XDSStatusDot variant={isOnline ? 'positive' : 'negative'} label="Status" />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]success['"]/);
    expect(output).toMatch(/['"]error['"]/);
    expect(output).not.toMatch(/['"]positive['"]/);
    expect(output).not.toMatch(/['"]negative['"]/);
  });

  it('does not rename an object property that is not connected to a sink', async () => {
    const input = `import { XDSStatusDot } from '@xds/core/StatusDot';
const args = { variant: 'positive' };`;
    const output = await applyTransform(input);
    expect(output).toContain("variant: 'positive'");
    expect(output).not.toMatch(/['"]success['"]/);
  });

  it('leaves context-blind Storybook options untouched', async () => {
    const input = `import { XDSStatusDot } from '@xds/core/StatusDot';
const meta = { argTypes: { variant: { options: ['positive', 'negative', 'warning', 'info', 'neutral'] } } };`;
    const output = await applyTransform(input);
    for (const value of ['positive', 'negative', 'warning', 'info', 'neutral']) {
      expect(output).toContain(`'${value}'`);
    }
    expect(output).not.toMatch(/['"]success['"]/);
    expect(output).not.toMatch(/['"]error['"]/);
    expect(output).not.toMatch(/['"]accent['"]/);
  });

  it('does not touch unrelated components', async () => {
    const input = `<XDSBadge variant="info" label="New" />`;
    const output = await applyTransform(input);
    // XDSBadge is not in the target list
    expect(output).toContain('info');
  });

  it('does not rewrite Badge config "info" in a file that also imports a target (Icon)', async () => {
    // Regression: a file may import a target component (e.g. XDSIcon) AND
    // declare a typed config object for a NON-target component (Badge, whose
    // BadgeVariantMap still has `info`). The context-blind object-property path
    // must NOT rewrite that `info` to `accent` just because the file imports a
    // target — `accent` is not a valid Badge variant. positive/negative stay
    // renamed (no component keeps them), but info is preserved.
    const input = `import { XDSIcon } from '@xds/core/Icon';
import { XDSBadge, type XDSBadgeVariant } from '@xds/core/Badge';
const PROGRESS_CONFIG: Record<string, {label: string; variant: XDSBadgeVariant}> = {
  OPEN: {label: 'Open', variant: 'info'},
  DONE: {label: 'Done', variant: 'positive'},
  BLOCKED: {label: 'Blocked', variant: 'negative'},
};`;
    const output = await applyTransform(input);
    // No object value is rewritten merely because the file imports a target.
    expect(output).toContain("variant: 'info'");
    expect(output).toContain("variant: 'positive'");
    expect(output).toContain("variant: 'negative'");
    expect(output).not.toMatch(/['"]accent['"]/);
    expect(output).not.toMatch(/['"]success['"]/);
    expect(output).not.toMatch(/['"]error['"]/);
  });

  it('still renames "info" to "accent" on a direct target JSX attribute', async () => {
    // The precise path (component is known) keeps the full mapping, including
    // the ambiguous info -> accent, even when other components are imported.
    const input = `import { XDSStatusDot } from '@xds/core/StatusDot';
import { XDSBadge } from '@xds/core/Badge';
const a = <XDSStatusDot variant="info" label="Status" />;
const b = <XDSBadge variant="info" label="New" />;`;
    const output = await applyTransform(input);
    // StatusDot's info -> accent (precise), Badge's info stays.
    expect(output).toContain('<XDSStatusDot variant="accent"');
    expect(output).toContain('<XDSBadge variant="info"');
  });

  it('does not touch unrelated props on target components', async () => {
    const input = `<XDSStatusDot variant="positive" label="positive result" />`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]success['"]/);
    // The label "positive result" should NOT be renamed
    expect(output).toContain('positive result');
  });

  it('returns undefined when no changes needed', async () => {
    const {default: transform} = await import(
      '../rename-status-variants.mjs'
    );
    const jscodeshift = (await import('jscodeshift')).default;
    const j = jscodeshift.withParser('tsx');
    const api = {jscodeshift: j, stats: () => {}, report: () => {}};
    const source = `<XDSStatusDot variant='success' label='Online' />`;
    const result = transform({source, path: 'test.tsx'}, api);
    expect(result).toBeUndefined();
  });

  it('handles a full component file', async () => {
    const input = `import { XDSStatusDot } from '@xds/core/StatusDot';
import { XDSIcon } from '@xds/core/Icon';

function StatusIndicator({ isOnline }: { isOnline: boolean }) {
  return (
    <div>
      <XDSStatusDot
        variant={isOnline ? 'positive' : 'negative'}
        label={isOnline ? 'Online' : 'Offline'}
      />
      <XDSIcon
        icon={isOnline ? CheckIcon : XIcon}
        color={isOnline ? 'positive' : 'negative'}
      />
    </div>
  );
}`;
    const output = await applyTransform(input);
    expect(output).toMatch(/['"]success['"]/);
    expect(output).toMatch(/['"]error['"]/);
    expect(output).not.toMatch(/['"]positive['"]/);
    expect(output).not.toMatch(/['"]negative['"]/);
  });
});
