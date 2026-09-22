// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Codemod: Rename status variants positive/negative → success/error
 * @see https://github.com/facebookexperimental/xds/issues/996
 *
 * Uses the project-aware compiler graph to trace old values backward from
 * imported StatusDot/AvatarStatusDot/ProgressBar variant props, Icon/SVGIcon
 * color props, and Badge variant props. Only reached literals and their
 * sink-derived type declarations are edited.
 */

import {createLiteralMigrationProject} from '../../project-analysis.mjs';

export const meta = {
  title: 'Rename status variants positive/negative → success/error',
  description:
    'Renames status values through local and cross-file helper, object, and wrapper flows. ' +
    'Status-style info becomes accent; Badge info remains info. Conflicting flows fail closed.',
  pr: '#996',
};

const PROJECT_SPEC = {
  components: {
    StatusDot: {variant: 'status'},
    AvatarStatusDot: {variant: 'status'},
    ProgressBar: {variant: 'status'},
    Icon: {color: 'status'},
    SVGIcon: {color: 'status'},
    Badge: {variant: 'badge'},
  },
  renames: {
    status: {
      positive: 'success',
      negative: 'error',
      info: 'accent',
    },
    badge: {
      positive: 'success',
      negative: 'error',
      info: 'info',
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
