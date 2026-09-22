// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Codemod: Rename Avatar named sizes to Icon's abbreviated scale
 * @see https://github.com/facebook/astryx/issues/2672
 *
 * Traces Avatar/AvatarGroup size values through compiler symbols, including
 * cross-file helpers, object fields, and app-owned JSX wrapper props. Only
 * literals that feed an imported target component are changed.
 */

import {createLiteralMigrationProject} from '../../project-analysis.mjs';

export const meta = {
  title: 'Rename Avatar named sizes tiny/xsmall/small/medium/large → xsm/sm/md/lg/xl',
  description:
    'Renames Avatar and AvatarGroup sizes through local and cross-file helper, object, ' +
    'and wrapper flows while leaving unrelated size-like values untouched.',
  pr: '#2672',
};

const PROJECT_SPEC = {
  components: {
    Avatar: {size: 'avatar-size'},
    AvatarGroup: {size: 'avatar-size'},
  },
  renames: {
    'avatar-size': {
      tiny: 'xsm',
      xsmall: 'sm',
      small: 'md',
      medium: 'lg',
      large: 'xl',
    },
  },
};

/**
 * Prepare one symbol graph for every actual source file selected by the runner.
 * @param {ReadonlyArray<import('../../../../authoring/codemod/type').AstryxCodemodFile>} files
 */
export function prepareProject(files) {
  return createLiteralMigrationProject(files, PROJECT_SPEC);
}

/**
 * @param {import('../../../../authoring/codemod/type').AstryxCodemodFile} file
 * @param {import('../../../../authoring/codemod/type').CodemodTransformApi} api
 * @returns {string | null | undefined}
 */
function transformer(file, api) {
  const project = /** @type {ReturnType<typeof prepareProject>} */ (
    api.project ?? prepareProject([file])
  );
  return project.transform(file);
}

transformer.prepare = prepareProject;

export default transformer;
