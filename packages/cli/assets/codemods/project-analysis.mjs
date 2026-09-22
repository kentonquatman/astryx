// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Compiler-backed, sink-derived literal migration for project codemods.
 *
 * A project transform supplies imported component/prop sinks and value maps.
 * This module walks backward from those sinks through TypeScript symbols,
 * calls, returns, object fields, and JSX wrapper props. It records only the
 * source ranges of string literals, so applying a project keeps all unrelated
 * formatting byte-for-byte intact.
 */

import * as path from 'node:path';
import ts from 'typescript';

const CORE_IMPORT_RE = /^@(astryxdesign|xds)\/core(?:\/|$)/;
const RELATED_BINARY_OPERATORS = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
]);

/** @param {string} fileName */
function scriptKindForFileName(fileName) {
  switch (path.extname(fileName)) {
    case '.ts':
      return ts.ScriptKind.TS;
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.json':
      return ts.ScriptKind.JSON;
    default:
      return ts.ScriptKind.JS;
  }
}

/** @param {string} fileName */
function extensionForFileName(fileName) {
  switch (path.extname(fileName)) {
    case '.ts':
      return ts.Extension.Ts;
    case '.tsx':
      return ts.Extension.Tsx;
    case '.jsx':
      return ts.Extension.Jsx;
    case '.mjs':
      return ts.Extension.Mjs;
    case '.cjs':
      return ts.Extension.Cjs;
    default:
      return ts.Extension.Js;
  }
}

/** @param {string} name */
function canonicalComponentName(name) {
  return name.startsWith('XDS') ? name.slice(3) : name;
}

/** @param {ts.Node | undefined} node */
function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return null;
}

/** @param {ts.Node} node */
function containingSourceFile(node) {
  return node.getSourceFile();
}

/** @param {ts.Node} node @returns {ts.FunctionLikeDeclaration | null} */
function containingFunction(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionLike(current) && 'body' in current) {
      return /** @type {ts.FunctionLikeDeclaration} */ (current);
    }
  }
  return null;
}

/** @param {ts.FunctionLikeDeclaration} fn */
function returnExpressions(fn) {
  if (!fn.body) return [];
  if (!ts.isBlock(fn.body)) return [fn.body];
  /** @type {ts.Expression[]} */
  const results = [];
  /** @param {ts.Node} node */
  function visit(node) {
    if (node !== fn && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) {
      results.push(node.expression);
      return;
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(fn.body, visit);
  return results;
}

/**
 * Create one project context from the exact source snapshots supplied by the
 * runner.
 *
 * @param {ReadonlyArray<import('../../authoring/codemod/type').AstryxCodemodFile>} files
 * @param {{
 *   components: Record<string, Record<string, string>>,
 *   renames: Record<string, Record<string, string>>,
 * }} spec
 */
export function createLiteralMigrationProject(files, spec) {
  const fileByPath = new Map(
    files.map(file => [path.resolve(file.path), file.source]),
  );
  const options = {
    allowJs: true,
    checkJs: false,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.Latest,
    skipLibCheck: true,
  };
  const host = ts.createCompilerHost(options, true);
  const originalFileExists = host.fileExists.bind(host);
  const originalReadFile = host.readFile.bind(host);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = fileName =>
    fileByPath.has(path.resolve(fileName)) || originalFileExists(fileName);
  host.readFile = fileName =>
    fileByPath.get(path.resolve(fileName)) ?? originalReadFile(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const source = fileByPath.get(path.resolve(fileName));
    if (source == null) {
      return originalGetSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreate,
      );
    }
    return ts.createSourceFile(
      fileName,
      source,
      languageVersion,
      true,
      scriptKindForFileName(fileName),
    );
  };

  const programHost = host;
  programHost.resolveModuleNames = (moduleNames, containingFile) =>
    moduleNames.map(moduleName => {
      if (moduleName.startsWith('.')) {
        const base = path.resolve(path.dirname(containingFile), moduleName);
        const candidates = [
          base,
          ...['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs'].map(ext => base + ext),
          ...['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs'].map(ext =>
            path.join(base, `index${ext}`),
          ),
        ];
        const resolvedFileName = candidates.find(candidate =>
          fileByPath.has(path.resolve(candidate)),
        );
        if (resolvedFileName) {
          return {
            resolvedFileName,
            extension: extensionForFileName(resolvedFileName),
          };
        }
      }
      return ts.resolveModuleName(
        moduleName,
        containingFile,
        options,
        host,
      ).resolvedModule;
    });

  const program = ts.createProgram([...fileByPath.keys()], options, programHost);
  const checker = program.getTypeChecker();
  const sourceFiles = program
    .getSourceFiles()
    .filter(sourceFile => fileByPath.has(path.resolve(sourceFile.fileName)));

  /** @type {Map<ts.Symbol, string>} */
  const componentBindings = new Map();
  /** @type {Map<ts.Symbol, true>} */
  const namespaceBindings = new Map();
  /** @type {Map<ts.Symbol, ts.CallExpression[]>} */
  const callsBySymbol = new Map();
  /** @type {Map<ts.Symbol, ts.JsxOpeningLikeElement[]>} */
  const jsxCallsBySymbol = new Map();
  /** @type {ts.BinaryExpression[]} */
  const comparisons = [];

  /** @param {ts.Node} node */
  function rawSymbol(node) {
    return checker.getSymbolAtLocation(node);
  }

  /** @param {ts.Node} node */
  function resolvedSymbol(node) {
    let symbol = rawSymbol(node);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
      try {
        symbol = checker.getAliasedSymbol(symbol);
      } catch {
        // An unresolved external import is still usable as a direct sink via
        // componentBindings; app-owned relative imports normally resolve.
      }
    }
    return symbol;
  }

  /** @param {Map<ts.Symbol, any[]>} map @param {ts.Symbol | undefined} symbol @param {any} value */
  function append(map, symbol, value) {
    if (!symbol) return;
    const current = map.get(symbol);
    if (current) current.push(value);
    else map.set(symbol, [value]);
  }

  for (const sourceFile of sourceFiles) {
    for (const statement of sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !CORE_IMPORT_RE.test(statement.moduleSpecifier.text) ||
        !statement.importClause
      ) {
        continue;
      }
      const source = statement.moduleSpecifier.text;
      const subpathName = canonicalComponentName(source.split('/').at(-1) ?? '');
      const clause = statement.importClause;
      if (clause.name && spec.components[subpathName]) {
        const symbol = rawSymbol(clause.name);
        if (symbol) componentBindings.set(symbol, subpathName);
      }
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        const symbol = rawSymbol(bindings.name);
        if (symbol) namespaceBindings.set(symbol, true);
      } else if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const imported = canonicalComponentName(
            (element.propertyName ?? element.name).text,
          );
          if (!spec.components[imported]) continue;
          const symbol = rawSymbol(element.name);
          if (symbol) componentBindings.set(symbol, imported);
        }
      }
    }
  }

  /** @param {ts.Node} node */
  function index(node) {
    if (ts.isCallExpression(node)) {
      append(callsBySymbol, resolvedSymbol(node.expression), node);
    } else if (ts.isBinaryExpression(node)) {
      comparisons.push(node);
    } else if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName;
      if (ts.isIdentifier(tag)) {
        append(jsxCallsBySymbol, resolvedSymbol(tag), node);
      }
    }
    ts.forEachChild(node, index);
  }
  sourceFiles.forEach(index);

  /** @type {Map<string, {fileName: string, start: number, end: number, original: string, replacements: Set<string>}>} */
  const requests = new Map();
  const visited = new Set();

  /** @param {ts.StringLiteralLike} literal @param {string} contract */
  function requestLiteral(literal, contract) {
    const replacement = spec.renames[contract]?.[literal.text];
    if (replacement == null) return;
    const sourceFile = containingSourceFile(literal);
    const fileName = path.resolve(sourceFile.fileName);
    const start = literal.getStart(sourceFile) + 1;
    const end = literal.getEnd() - 1;
    const key = `${fileName}:${start}:${end}`;
    let request = requests.get(key);
    if (!request) {
      request = {
        fileName,
        start,
        end,
        original: literal.text,
        replacements: new Set(),
      };
      requests.set(key, request);
    }
    request.replacements.add(replacement);
  }

  /** @param {ts.Node} node @param {string} contract @param {string} mode */
  function enter(node, contract, mode) {
    const sourceFile = containingSourceFile(node);
    const key = `${path.resolve(sourceFile.fileName)}:${node.pos}:${node.end}:${contract}:${mode}`;
    if (visited.has(key)) return false;
    visited.add(key);
    return true;
  }

  /** @param {ts.TypeNode | undefined} typeNode @param {string} contract */
  function traceType(typeNode, contract) {
    if (!typeNode || !enter(typeNode, contract, 'type')) return;
    if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteralLike(typeNode.literal)) {
      requestLiteral(typeNode.literal, contract);
      return;
    }
    if (ts.isTypeReferenceNode(typeNode)) {
      const symbol = resolvedSymbol(typeNode.typeName);
      for (const declaration of symbol?.declarations ?? []) {
        if (ts.isTypeAliasDeclaration(declaration)) {
          traceType(declaration.type, contract);
        }
      }
      return;
    }
    if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) {
      typeNode.types.forEach(type => traceType(type, contract));
      return;
    }
    if (ts.isTupleTypeNode(typeNode)) {
      typeNode.elements.forEach(element =>
        traceType(ts.isNamedTupleMember(element) ? element.type : element, contract),
      );
      return;
    }
    if (ts.isParenthesizedTypeNode(typeNode) || ts.isOptionalTypeNode(typeNode)) {
      traceType(typeNode.type, contract);
      return;
    }
    if (ts.isArrayTypeNode(typeNode)) {
      traceType(typeNode.elementType, contract);
    }
  }

  /** @param {ts.TypeNode | undefined} typeNode @param {string} name @param {string} contract */
  function tracePropertyType(typeNode, name, contract) {
    if (!typeNode || !enter(typeNode, contract, `property-type:${name}`)) return;
    if (ts.isTypeReferenceNode(typeNode)) {
      const symbol = resolvedSymbol(typeNode.typeName);
      for (const declaration of symbol?.declarations ?? []) {
        if (ts.isTypeAliasDeclaration(declaration)) {
          tracePropertyType(declaration.type, name, contract);
        } else if (ts.isInterfaceDeclaration(declaration)) {
          for (const member of declaration.members) {
            if (
              ts.isPropertySignature(member) &&
              propertyName(member.name) === name
            ) {
              traceType(member.type, contract);
            }
          }
        }
      }
      return;
    }
    if (ts.isTypeLiteralNode(typeNode)) {
      for (const member of typeNode.members) {
        if (
          ts.isPropertySignature(member) &&
          propertyName(member.name) === name
        ) {
          traceType(member.type, contract);
        }
      }
      return;
    }
    if (
      ts.isUnionTypeNode(typeNode) ||
      ts.isIntersectionTypeNode(typeNode) ||
      ts.isParenthesizedTypeNode(typeNode)
    ) {
      if (ts.isParenthesizedTypeNode(typeNode)) {
        tracePropertyType(typeNode.type, name, contract);
      } else {
        typeNode.types.forEach(type => tracePropertyType(type, name, contract));
      }
    }
  }

  /** @param {ts.FunctionLikeDeclaration} fn */
  function functionSymbol(fn) {
    if (fn.name && ts.isIdentifier(fn.name)) return resolvedSymbol(fn.name);
    const parent = fn.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return resolvedSymbol(parent.name);
    }
    if (ts.isPropertyAssignment(parent)) return resolvedSymbol(parent.name);
    return undefined;
  }

  /**
   * @param {ts.ParameterDeclaration} parameter
   * @param {string} contract
   * @param {string | null} prop
   */
  function traceParameter(parameter, contract, prop = null) {
    if (!enter(parameter, contract, `parameter:${prop ?? ''}`)) return;
    if (parameter.initializer) traceExpression(parameter.initializer, contract);
    if (prop) {
      tracePropertyType(parameter.type, prop, contract);
      if (ts.isIdentifier(parameter.name)) {
        const symbol = resolvedSymbol(parameter.name);
        if (symbol) tracePropertyComparisons(symbol, prop, contract);
      }
    } else traceType(parameter.type, contract);

    const fn = containingFunction(parameter);
    if (!fn) return;
    const index = fn.parameters.indexOf(parameter);
    const symbol = functionSymbol(fn);
    if (!symbol) return;
    for (const call of callsBySymbol.get(symbol) ?? []) {
      const argument = call.arguments[index];
      if (!argument) continue;
      if (prop) traceObjectProperty(argument, prop, contract);
      else traceExpression(argument, contract);
    }
    if (!prop && !ts.isObjectBindingPattern(parameter.name)) return;
    for (const opening of jsxCallsBySymbol.get(symbol) ?? []) {
      if (prop) traceJsxProp(opening, prop, contract);
    }
  }

  /** @param {ts.BindingElement} binding @param {string} contract */
  function traceBindingElement(binding, contract) {
    if (binding.initializer) traceExpression(binding.initializer, contract);
    const pattern = binding.parent;
    if (!ts.isObjectBindingPattern(pattern)) return;
    const prop = propertyName(binding.propertyName ?? binding.name);
    if (!prop) return;
    const parameter = pattern.parent;
    if (ts.isParameter(parameter)) {
      traceParameter(parameter, contract, prop);
      return;
    }
    if (ts.isVariableDeclaration(parameter) && parameter.initializer) {
      tracePropertyType(parameter.type, prop, contract);
      traceObjectProperty(parameter.initializer, prop, contract);
    }
  }

  /** @param {ts.Expression} expression */
  function unwrappedExpression(expression) {
    let current = expression;
    while (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isSatisfiesExpression(current)
    ) {
      current = current.expression;
    }
    return current;
  }

  /** @param {ts.Symbol} symbol @param {string} contract */
  function traceSymbolComparisons(symbol, contract) {
    for (const comparison of comparisons) {
      if (!RELATED_BINARY_OPERATORS.has(comparison.operatorToken.kind)) continue;
      const left = unwrappedExpression(comparison.left);
      const right = unwrappedExpression(comparison.right);
      if (ts.isIdentifier(left) && resolvedSymbol(left) === symbol && ts.isStringLiteralLike(right)) {
        requestLiteral(right, contract);
      }
      if (ts.isIdentifier(right) && resolvedSymbol(right) === symbol && ts.isStringLiteralLike(left)) {
        requestLiteral(left, contract);
      }
    }
  }

  /** @param {ts.Symbol} symbol @param {string} prop @param {string} contract */
  function tracePropertyComparisons(symbol, prop, contract) {
    for (const comparison of comparisons) {
      if (!RELATED_BINARY_OPERATORS.has(comparison.operatorToken.kind)) continue;
      const pairs = [
        [unwrappedExpression(comparison.left), unwrappedExpression(comparison.right)],
        [unwrappedExpression(comparison.right), unwrappedExpression(comparison.left)],
      ];
      for (const [candidate, literal] of pairs) {
        if (
          ts.isPropertyAccessExpression(candidate) &&
          ts.isIdentifier(candidate.expression) &&
          resolvedSymbol(candidate.expression) === symbol &&
          candidate.name.text === prop &&
          ts.isStringLiteralLike(literal)
        ) {
          requestLiteral(literal, contract);
        }
      }
    }
  }

  /** @param {ts.Symbol | undefined} symbol @param {string} contract */
  function traceSymbol(symbol, contract) {
    if (!symbol) return;
    traceSymbolComparisons(symbol, contract);
    for (const declaration of symbol.declarations ?? []) {
      if (ts.isVariableDeclaration(declaration)) {
        traceType(declaration.type, contract);
        if (declaration.initializer) {
          traceExpression(declaration.initializer, contract);
        }
      } else if (ts.isBindingElement(declaration)) {
        traceBindingElement(declaration, contract);
      } else if (ts.isParameter(declaration)) {
        traceParameter(declaration, contract);
      } else if (ts.isPropertyAssignment(declaration)) {
        traceExpression(declaration.initializer, contract);
      } else if (ts.isShorthandPropertyAssignment(declaration)) {
        traceSymbol(resolvedSymbol(declaration.name), contract);
      }
    }
  }

  /** @param {ts.Expression} expression @param {string} name @param {string} contract */
  function traceObjectProperty(expression, name, contract) {
    if (!enter(expression, contract, `object:${name}`)) return;
    if (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isTypeAssertionExpression(expression) ||
      ts.isNonNullExpression(expression) ||
      ts.isSatisfiesExpression(expression)
    ) {
      traceObjectProperty(expression.expression, name, contract);
      return;
    }
    if (ts.isObjectLiteralExpression(expression)) {
      // Object and JSX spreads obey last-write-wins. Walk backward and stop at
      // the first explicit property or spread that could supply this field.
      for (const property of [...expression.properties].reverse()) {
        if (
          ts.isPropertyAssignment(property) &&
          propertyName(property.name) === name
        ) {
          traceExpression(property.initializer, contract);
          return;
        }
        if (
          ts.isShorthandPropertyAssignment(property) &&
          property.name.text === name
        ) {
          traceSymbol(resolvedSymbol(property.name), contract);
          return;
        }
        if (ts.isSpreadAssignment(property)) {
          traceObjectProperty(property.expression, name, contract);
          return;
        }
      }
      return;
    }
    if (ts.isIdentifier(expression)) {
      const symbol = resolvedSymbol(expression);
      for (const declaration of symbol?.declarations ?? []) {
        if (ts.isVariableDeclaration(declaration)) {
          tracePropertyType(declaration.type, name, contract);
          if (declaration.initializer) {
            traceObjectProperty(declaration.initializer, name, contract);
          }
        } else if (ts.isParameter(declaration)) {
          traceParameter(declaration, contract, name);
        } else if (ts.isBindingElement(declaration)) {
          traceBindingElement(declaration, contract);
        }
      }
      return;
    }
    if (ts.isCallExpression(expression)) {
      const symbol = resolvedSymbol(expression.expression);
      for (const declaration of symbol?.declarations ?? []) {
        if (ts.isFunctionLike(declaration) && 'body' in declaration) {
          const fn = /** @type {ts.FunctionLikeDeclaration} */ (declaration);
          tracePropertyType(fn.type, name, contract);
          returnExpressions(fn).forEach(result =>
            traceObjectProperty(result, name, contract),
          );
        } else if (
          ts.isVariableDeclaration(declaration) &&
          declaration.initializer &&
          ts.isFunctionLike(declaration.initializer)
        ) {
          tracePropertyType(declaration.initializer.type, name, contract);
          returnExpressions(declaration.initializer).forEach(result =>
            traceObjectProperty(result, name, contract),
          );
        }
      }
      return;
    }
    if (ts.isConditionalExpression(expression)) {
      traceObjectProperty(expression.whenTrue, name, contract);
      traceObjectProperty(expression.whenFalse, name, contract);
    }
  }

  /**
   * @param {ts.Expression} expression
   * @param {string} contract
   * @param {Map<ts.Symbol, ts.Expression>} [argumentsByParameter]
   */
  function traceExpression(expression, contract, argumentsByParameter) {
    const contextKey = argumentsByParameter
      ? [...argumentsByParameter.values()]
          .map(argument => `${argument.getSourceFile().fileName}:${argument.pos}`)
          .join(',')
      : '';
    if (!enter(expression, contract, `expression:${contextKey}`)) return;
    if (ts.isStringLiteralLike(expression)) {
      requestLiteral(expression, contract);
      return;
    }
    if (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isTypeAssertionExpression(expression) ||
      ts.isNonNullExpression(expression) ||
      ts.isSatisfiesExpression(expression)
    ) {
      traceExpression(expression.expression, contract, argumentsByParameter);
      return;
    }
    if (ts.isIdentifier(expression)) {
      const symbol = resolvedSymbol(expression);
      const argument = symbol && argumentsByParameter?.get(symbol);
      if (argument) traceExpression(argument, contract);
      else traceSymbol(symbol, contract);
      return;
    }
    if (ts.isConditionalExpression(expression)) {
      traceExpression(expression.whenTrue, contract, argumentsByParameter);
      traceExpression(expression.whenFalse, contract, argumentsByParameter);
      return;
    }
    if (ts.isBinaryExpression(expression)) {
      if (
        expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
        expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ) {
        traceExpression(expression.left, contract, argumentsByParameter);
        traceExpression(expression.right, contract, argumentsByParameter);
      }
      return;
    }
    if (ts.isCallExpression(expression)) {
      const symbol = resolvedSymbol(expression.expression);
      for (const declaration of symbol?.declarations ?? []) {
        let fn = null;
        if (ts.isFunctionLike(declaration) && 'body' in declaration) {
          fn = /** @type {ts.FunctionLikeDeclaration} */ (declaration);
        } else if (
          ts.isVariableDeclaration(declaration) &&
          declaration.initializer &&
          ts.isFunctionLike(declaration.initializer)
        ) {
          fn = declaration.initializer;
        }
        if (!fn) continue;
        traceType(fn.type, contract);
        /** @type {Map<ts.Symbol, ts.Expression>} */
        const callArguments = new Map();
        fn.parameters.forEach((parameter, index) => {
          if (!ts.isIdentifier(parameter.name) || !expression.arguments[index]) {
            return;
          }
          const parameterSymbol = resolvedSymbol(parameter.name);
          if (parameterSymbol) {
            callArguments.set(parameterSymbol, expression.arguments[index]);
          }
        });
        returnExpressions(fn).forEach(result =>
          traceExpression(result, contract, callArguments),
        );
      }
      return;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      const base = expression.expression;
      if (ts.isIdentifier(base)) {
        const symbol = resolvedSymbol(base);
        const argument = symbol && argumentsByParameter?.get(symbol);
        if (argument) {
          traceObjectProperty(argument, expression.name.text, contract);
          return;
        }
        const parameter = (symbol?.declarations ?? []).find(ts.isParameter);
        if (parameter) {
          traceParameter(parameter, contract, expression.name.text);
          return;
        }
      }
      const propertySymbol = resolvedSymbol(expression.name);
      if (propertySymbol?.declarations?.length) {
        traceSymbol(propertySymbol, contract);
      }
      // A typed object's property symbol may resolve only to a PropertySignature,
      // which has no runtime initializer. Also inspect the base value so the
      // corresponding object-literal field remains reachable.
      traceObjectProperty(base, expression.name.text, contract);
      return;
    }
    if (
      ts.isElementAccessExpression(expression) &&
      expression.argumentExpression &&
      ts.isStringLiteralLike(expression.argumentExpression)
    ) {
      traceObjectProperty(
        expression.expression,
        expression.argumentExpression.text,
        contract,
      );
    }
  }

  /**
   * @param {ts.JsxOpeningLikeElement} opening
   * @param {string} prop
   * @param {string} contract
   */
  function traceJsxProp(opening, prop, contract) {
    // JSX attributes are last-write-wins. A dynamic spread is an uncertainty
    // boundary, so stop rather than also rewriting an earlier explicit value.
    for (const attribute of [...opening.attributes.properties].reverse()) {
      if (
        ts.isJsxAttribute(attribute) &&
        ts.isIdentifier(attribute.name) &&
        attribute.name.text === prop
      ) {
        const initializer = attribute.initializer;
        if (initializer && ts.isStringLiteral(initializer)) {
          requestLiteral(initializer, contract);
        } else if (
          initializer &&
          ts.isJsxExpression(initializer) &&
          initializer.expression
        ) {
          traceExpression(initializer.expression, contract);
        }
        return;
      }
      if (ts.isJsxSpreadAttribute(attribute)) {
        traceObjectProperty(attribute.expression, prop, contract);
        return;
      }
    }
  }

  /** @param {ts.JsxTagNameExpression} tag */
  function componentForTag(tag) {
    if (ts.isIdentifier(tag)) {
      const symbol = rawSymbol(tag);
      return symbol ? componentBindings.get(symbol) : undefined;
    }
    if (ts.isPropertyAccessExpression(tag)) {
      const root = tag.expression;
      const rootSymbol = ts.isIdentifier(root) ? rawSymbol(root) : undefined;
      if (rootSymbol && namespaceBindings.has(rootSymbol)) {
        const name = canonicalComponentName(tag.name.text);
        return spec.components[name] ? name : undefined;
      }
    }
    return undefined;
  }

  for (const sourceFile of sourceFiles) {
    /** @param {ts.Node} node */
    function findSinks(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const component = componentForTag(node.tagName);
        const props = component ? spec.components[component] : null;
        if (props) {
          for (const [prop, contract] of Object.entries(props)) {
            traceJsxProp(node, prop, contract);
          }
        }
      }
      ts.forEachChild(node, findSinks);
    }
    findSinks(sourceFile);
  }

  /** @type {Map<string, Array<{start: number, end: number, text: string}>>} */
  const editsByFile = new Map();
  /** @type {string[]} */
  const conflicts = [];
  for (const request of requests.values()) {
    const {fileName} = request;
    if (request.replacements.size !== 1) {
      const relative = path.relative(process.cwd(), fileName) || fileName;
      conflicts.push(
        `${relative}:${request.start} (${request.original} -> ${[
          ...request.replacements,
        ].join(' or ')})`,
      );
      continue;
    }
    const [replacement] = request.replacements;
    if (replacement == null || replacement === request.original) continue;
    const edits = editsByFile.get(fileName) ?? [];
    edits.push({start: request.start, end: request.end, text: replacement});
    editsByFile.set(fileName, edits);
  }
  if (conflicts.length > 0) {
    throw new Error(
      `Unsafe codemod flow feeds incompatible component contracts: ${conflicts.join(', ')}`,
    );
  }

  return {
    /**
     * Apply the precomputed bounded edits for one runner-provided file.
     * @param {import('../../authoring/codemod/type').AstryxCodemodFile} file
     */
    transform(file) {
      const edits = editsByFile.get(path.resolve(file.path));
      if (!edits?.length) return undefined;
      let result = file.source;
      for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
        result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
      }
      return result;
    },
  };
}
