// Copyright (c) Meta Platforms, Inc. and affiliates.

import {describe, expect, it} from 'vitest';
import transform from '../rename-avatar-size-scale.mjs';

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

describe('rename-avatar-size-scale project analysis', () => {
  it('follows cross-file helper returns, chains, and object fields', () => {
    const output = applyProject({
      'sizes.ts': `const values: {primary: 'small'} = {primary: 'small'};
export function base() { return values.primary; }
export function avatarSize() { return base(); }`,
      'view.tsx': `import {Avatar} from '@astryxdesign/core/Avatar';
import {avatarSize} from './sizes';
export const view = <Avatar name="A" size={avatarSize()} />;`,
    });

    expect(output['sizes.ts']).toContain(
      "const values: {primary: 'md'} = {primary: 'md'}",
    );
    expect(output['view.tsx']).toContain('size={avatarSize()}');
  });

  it('follows a cross-file app wrapper prop and its type', () => {
    const output = applyProject({
      'wrapper.tsx': `import {AvatarGroup} from '@xds/core';
export const Faces = ({size}: {size: 'tiny' | 'large'}) => (
  <AvatarGroup size={size}>{null}</AvatarGroup>
);`,
      'app.tsx': `import {Faces as TeamFaces} from './wrapper';
export const app = <TeamFaces size="large" />;`,
    });

    expect(output['wrapper.tsx']).toContain("size: 'xsm' | 'xl'");
    expect(output['app.tsx']).toContain('size="xl"');
  });

  it('leaves unrelated size values and unions untouched', () => {
    const output = applyProject({
      'view.tsx': `import {Avatar} from '@astryxdesign/core';
type Density = 'small' | 'medium' | 'large';
const card = {size: 'small' as const};
export const view = <Avatar name="A" size="xsmall" />;`,
    })['view.tsx'];

    expect(output).toContain("type Density = 'small' | 'medium' | 'large'");
    expect(output).toContain("const card = {size: 'small' as const}");
    expect(output).toContain('size="sm"');
  });

  it('honors aliases and ignores a shadowing local component', () => {
    const output = applyProject({
      'alias.tsx': `import {Avatar as Face} from '@astryxdesign/core';
const migrated = <Face name="A" size="medium" />;
function Local(Face: (props: {size: string}) => unknown) {
  return <Face size="large" />;
}`,
    })['alias.tsx'];

    expect(output).toContain('size="lg"');
    expect(output).toContain('size="large"');
  });
});
