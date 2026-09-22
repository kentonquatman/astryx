// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Shared codemod execution primitives.
 *
 * Both the core registry runner (`runner.mjs` / `upgrade.mjs`) and the
 * integration runner (`integration-runner.mjs`) execute codemods that follow
 * the unified file-based contract:
 *
 *   (file, api) => string | null | undefined
 *
 * where `file` is `{path, source}` and `api` is
 * `{jscodeshift, stats, report, project?}`. A transform may attach a synchronous
 * `prepare(files)` hook; the runner calls it once with the selected source
 * snapshots and passes its return value as `api.project`. Config codemods target
 * the consumer's
 * astryx.config.* file; code codemods are applied to source files discovered
 * under `--path`, filtered by each codemod's `fileExtensions`.
 *
 * A codemod ENTRY is normalized to a single shape across both callers:
 *
 *   {id, type: 'code' | 'config', codemod: {title, transform, fileExtensions?,
 *    isOptional?}, package, version}
 *
 * Integration discovery emits this shape directly. The core registry stores
 * entries as `{name, transform, meta}`; `runner.mjs` normalizes those to this
 * shape at the boundary (see `runner.mjs`).
 *
 * Both kinds reuse the shared output validation from runner.mjs and surface a
 * transform throw as an error (strictness contract).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as p from './term-log.mjs';
import {findConfigPath} from '../../foundation/config/project.mjs';
import {fixDirectiveCorruption, validateOutput, IGNORED_DIRS} from './runner.mjs';

export const DEFAULT_CODE_EXTENSIONS = [
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.mjs',
  '.cjs',
];
const PARSEABLE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs'];

/**
 * Recursively find candidate source files in a directory.
 * @param {string} dir
 * @returns {string[]}
 */
export function findSourceFiles(dir) {
  /** @type {string[]} */
  const results = [];
  /** @param {string} currentDir */
  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, {withFileTypes: true});
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      // Never follow symlinks — writing through one would rewrite its target
      // outside the scan tree (e.g. into node_modules or anywhere on disk).
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }
  walk(dir);
  return results.sort();
}

/**
 * No-op log surface for silent (`--json`) mode.
 * @param {boolean} silent
 * @returns {import('../../authoring/codemod/type').CliLog}
 */
export function makeLog(silent) {
  return silent
    ? {step() {}, info() {}, success() {}, warn() {}, error() {}, message() {}}
    : p.log;
}

/**
 * Apply a config codemod to the consumer's astryx.config.* file.
 *
 * @param {import('../../authoring/codemod/type').CodemodEntry} entry normalized codemod entry {id, codemod, package}
 * @param {{apply: boolean, log: import('../../authoring/codemod/type').CliLog, jscodeshift: import('../../authoring/codemod/type').JscodeshiftFactory}} ctx
 * @returns {import('../../authoring/codemod/type').CodemodRunResult}
 */
export function runConfigCodemod(entry, {apply, log, jscodeshift}) {
  const {codemod, id, package: pkg} = entry;
  const name = `${pkg}:${id}`;
  // findConfigPath throws when multiple astryx.config.* files coexist. Config
  // codemods run FIRST (before the strict project loader), so an uncaught throw
  // here aborts the entire `astryx upgrade` with an un-coded error — breaking
  // the per-codemod isolation every other failure path honors. Degrade it to a
  // structured error so the run continues and reports it.
  let configPath;
  try {
    configPath = findConfigPath(process.cwd());
  } catch (err) {
    const message = /** @type {any} */ (err).message;
    log.error(`    ✗ astryx.config.* — ${message}`);
    return {
      filesChanged: 0,
      writtenFiles: [],
      errors: [{file: 'astryx.config.*', codemod: name, error: message}],
    };
  }
  if (!configPath) {
    log.info(`  ${codemod.title} — no astryx.config.* found; skipping.`);
    return {filesChanged: 0, writtenFiles: [], errors: []};
  }

  const relativePath = path.relative(process.cwd(), configPath);
  try {
    const source = fs.readFileSync(configPath, 'utf-8');
    const ext = path.extname(configPath);
    const parser = ext === '.tsx' || ext === '.ts' ? 'tsx' : 'babel';
    const j = jscodeshift.withParser(parser);
    const api = {jscodeshift: j, stats: () => {}, report: () => {}};
    let result = codemod.transform({source, path: configPath}, api);

    if (result == null || result === source) {
      return {filesChanged: 0, writtenFiles: [], errors: []};
    }

    result = fixDirectiveCorruption(result);
    const validation = validateOutput(result, source, j, {
      parse: PARSEABLE_EXTENSIONS.includes(ext),
    });
    if (!validation.valid) {
      log.error(`    ✗ ${relativePath} — ${validation.reason}`);
      return {
        filesChanged: 0,
        writtenFiles: [],
        errors: [{file: relativePath, codemod: name, error: validation.reason}],
      };
    }

    if (apply) {
      fs.writeFileSync(configPath, result, 'utf-8');
      log.success(`    ✓ ${relativePath}`);
    } else {
      log.warn(`    ~ ${relativePath} (would change)`);
    }
    return {
      filesChanged: 1,
      writtenFiles: apply ? [configPath] : [],
      errors: [],
    };
  } catch (err) {
    const message = /** @type {any} */ (err).message;
    log.error(`    ✗ ${relativePath} — ${message}`);
    return {
      filesChanged: 0,
      writtenFiles: [],
      errors: [{file: relativePath, codemod: name, error: message}],
    };
  }
}

/**
 * Apply a code codemod to discovered source files.
 *
 * @param {import('../../authoring/codemod/type').CodemodEntry} entry normalized codemod entry {id, codemod, package}
 * @param {string[]} files
 * @param {{apply: boolean, log: import('../../authoring/codemod/type').CliLog, jscodeshift: import('../../authoring/codemod/type').JscodeshiftFactory}} ctx
 * @returns {import('../../authoring/codemod/type').CodemodRunResult}
 */
export function runCodeCodemod(entry, files, {apply, log, jscodeshift}) {
  const {codemod, id, package: pkg} = entry;
  const name = `${pkg}:${id}`;
  const extensions = new Set(codemod.fileExtensions ?? DEFAULT_CODE_EXTENSIONS);

  let filesChanged = 0;
  /** @type {string[]} */
  const writtenFiles = [];
  /** @type {Array<{file: string, codemod: string, error: string}>} */
  const errors = [];

  const transformFiles = files.filter(filePath =>
    extensions.has(path.extname(filePath)),
  );
  /** @type {Map<string, string>} */
  const preparedSources = new Map();
  let project;
  if (typeof codemod.transform.prepare === 'function') {
    try {
      const projectFiles = transformFiles.map(filePath => {
        const source = fs.readFileSync(filePath, 'utf-8');
        preparedSources.set(filePath, source);
        return {path: filePath, source};
      });
      project = codemod.transform.prepare(projectFiles);
    } catch (err) {
      const message = /** @type {any} */ (err).message;
      log.error(`    ✗ project preparation — ${message}`);
      return {
        filesChanged: 0,
        writtenFiles: [],
        errors: [{file: process.cwd(), codemod: name, error: message}],
      };
    }
  }

  const projectAware = typeof codemod.transform.prepare === 'function';
  const transformErrorStart = errors.length;
  /** @type {Array<{filePath: string, relativePath: string, result: string}>} */
  const pendingChanges = [];

  for (const filePath of transformFiles) {
    const ext = path.extname(filePath);
    const relativePath = path.relative(process.cwd(), filePath);
    try {
      const source =
        preparedSources.get(filePath) ?? fs.readFileSync(filePath, 'utf-8');
      const parser = ext === '.tsx' || ext === '.ts' ? 'tsx' : 'babel';
      const j = jscodeshift.withParser(parser);
      const api = {
        jscodeshift: j,
        stats: () => {},
        report: () => {},
        project,
      };
      let result = codemod.transform({source, path: filePath}, api);

      if (result == null || result === source) continue;

      result = fixDirectiveCorruption(result);
      const validation = validateOutput(result, source, j, {
        parse: PARSEABLE_EXTENSIONS.includes(ext),
      });
      if (!validation.valid) {
        log.error(`    ✗ ${relativePath} — ${validation.reason}`);
        errors.push({
          file: relativePath,
          codemod: name,
          error: validation.reason,
        });
        continue;
      }

      if (projectAware) {
        pendingChanges.push({filePath, relativePath, result});
      } else {
        filesChanged++;
        if (apply) {
          fs.writeFileSync(filePath, result, 'utf-8');
          writtenFiles.push(filePath);
          log.success(`    ✓ ${relativePath}`);
        } else {
          log.warn(`    ~ ${relativePath} (would change)`);
        }
      }
    } catch (err) {
      const message = /** @type {any} */ (err).message;
      log.error(`    ✗ ${relativePath} — ${message}`);
      errors.push({file: relativePath, codemod: name, error: message});
    }
  }

  // Project-aware migrations are validated as a set before any write starts.
  if (projectAware && errors.length === transformErrorStart) {
    filesChanged = pendingChanges.length;
    for (const change of pendingChanges) {
      if (apply) {
        fs.writeFileSync(change.filePath, change.result, 'utf-8');
        writtenFiles.push(change.filePath);
        log.success(`    ✓ ${change.relativePath}`);
      } else {
        log.warn(`    ~ ${change.relativePath} (would change)`);
      }
    }
  } else if (projectAware && pendingChanges.length > 0) {
    log.error('    ✗ project-aware changes were not written (validation failed)');
  }

  return {filesChanged, writtenFiles, errors};
}
