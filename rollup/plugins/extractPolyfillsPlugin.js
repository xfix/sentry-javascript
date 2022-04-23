import * as path from 'path';

import * as recast from 'recast';
import * as acornParser from 'recast/parsers/acorn';

const POLYFILL_NAMES = new Set([
  '_asyncNullishCoalesce',
  '_asyncOptionalChain',
  '_asyncOptionalChainDelete',
  '_createNamedExportFrom',
  '_createStarExport',
  '_interopDefault', // rollup's version
  '_interopNamespace', // rollup's version
  '_interopRequireDefault', // sucrase's version
  '_interopRequireWildcard', // sucrase's version
  '_nullishCoalesce',
  '_optionalChain',
  '_optionalChainDelete',
]);

export function makeExtractPolyfillsPlugin() {
  let moduleFormat;
  return {
    name: 'extractPolyfills',

    options(options) {
      moduleFormat = options.output[0].format;
    },

    renderChunk(code, chunk) {
      const sourceFile = chunk.fileName;
      const parserOptions = {
        sourceFileName: sourceFile,
        // We supply a custom parser which wraps the provided `acorn` parser in order to override the `ecmaVersion` value.
        // See https://github.com/benjamn/recast/issues/578.
        parser: {
          parse(source, options) {
            return acornParser.parse(source, {
              ...options,
              // By this point in the build, everything should already have been down-compiled to whatever JS version
              // we're targeting. Setting this parser to `latest` just means that whatever that version is (or changes
              // to in the future), it will be able to handle the generated code.
              ecmaVersion: 'latest',
            });
          },
        },
        quote: 'single',
      };

      const ast = recast.parse(code, parserOptions);

      const polyfillNodes = findPolyfillNodes(ast);

      if (polyfillNodes.length === 0) {
        return null;
      }

      console.log(
        sourceFile,
        polyfillNodes.map(node => node.name),
      );

      const importOrRequireNode = createImportRequireNode(polyfillNodes, sourceFile, moduleFormat);

      // Insert our new `require` node at the top of the file, and then delete the function definitions it's meant to
      // replace (polyfill nodes get marked for deletion in `findPolyfillNodes`)
      ast.program.body = [importOrRequireNode, ...ast.program.body.filter(node => !node.shouldDelete)];

      // In spite of the name, this doesn't actually print anything - it just stringifies the code, and keeps track of
      // where original nodes end up in order to generate a sourcemap.
      const result = recast.print(ast, {
        sourceMapName: `${sourceFile}.map`,
      });

      return { code: result.code, map: result.map };
    },
  };
}

function getNodeName(node) {
  if (node.type === 'VariableDeclaration') {
    // in practice sucrase and rollup only ever declare one polyfill at a time, so it's safe to just grab the first
    // entry here
    const declarationId = node.declarations[0].id;

    // sucrase and rollup seem to only use the first type of variable declaration for their polyfills, but good to cover
    // our bases

    // `const dogs = function() { return "are great"; };`
    // or
    // `const dogs = () => "are great";
    if (declarationId.type === 'Identifier') {
      return declarationId.name;
    }
    // `const { dogs } = { dogs: function() { return "are great"; } }`
    // or
    // `const { dogs } = { dogs: () => "are great" }`
    else if (declarationId.type === 'ObjectPattern') {
      return declarationId.properties[0].key.name;
    }
    // any other format
    else {
      return 'unknown variable';
    }
  }

  // `function dogs() { return "are great"; }`
  else if (node.type === 'FunctionDeclaration') {
    return node.id.name;
  }

  // this isn't a node we're interested in, so just return a string we know will never match any of the polyfill names
  else {
    return 'n/a';
  }
}

function findPolyfillNodes(ast) {
  return ast.program.body.filter(node => {
    const nodeName = getNodeName(node);
    if (POLYFILL_NAMES.has(nodeName)) {
      // mark this node for later deletion, since we're going to replace it with an import statement
      node.shouldDelete = true;
      // store the name in a consistent spot, regardless of node type
      node.name = nodeName;

      return true;
    }

    return false;
  });
}

/**
 * Create a node representing an `import` or `require` statement of the form
 *
 *     import { < polyfills > } from '...'
 * or
 *     var { < polyfills > } = require('...')
 *
 * @param polyfillNodes The nodes from the current version of the code, defining the polyfill functions
 * @param currentSourceFile The path, relative to `src/`, of the file currently being transpiled
 * @param moduleFormat Either 'cjs' or 'esm'
 * @returns A single node which can be subbed in for the polyfill definition nodes
 */
function createImportRequireNode(polyfillNodes, currentSourceFile, moduleFormat) {
  const {
    callExpression,
    identifier,
    importDeclaration,
    importSpecifier,
    literal,
    objectPattern,
    property,
    variableDeclaration,
    variableDeclarator,
  } = recast.types.builders;

  // since our polyfills live in `@sentry/utils`, if we're importing or requiring them there the path will have to be
  // relative
  const isUtilsPackage = process.cwd().endsWith('packages/utils');
  const importSource = literal(
    isUtilsPackage ? path.relative(path.dirname(currentSourceFile), '../jsPolyfills') : '@sentry/utils/jsPolyfills',
  );

  const importees = polyfillNodes.map(({ name: fnName }) =>
    moduleFormat === 'esm'
      ? importSpecifier(identifier(fnName))
      : property.from({ kind: 'init', key: identifier(fnName), value: identifier(fnName), shorthand: true }),
  );

  const requireFn = identifier('require');

  return moduleFormat === 'esm'
    ? importDeclaration(importees, importSource)
    : variableDeclaration('var', [
        variableDeclarator(objectPattern(importees), callExpression(requireFn, [importSource])),
      ]);

  // const polyfillLocation = isUtilsPackage
  //   ? path.relative(path.dirname(currentModule), '../jsPolyfills')
  //   : '@sentry/utils/jsPolyfills';

  // const importSource = literal(polyfillLocation);

  //   const importees = polyfillNodes.map(node => {
  //     const fnName = node.name;
  //
  //     return format === 'esm'
  //       ? importSpecifier(identifier(fnName))
  //       : property.from({ kind: 'init', key: identifier(fnName), value: identifier(fnName), shorthand: true });
  //   });

  //   if (format === 'cjs') {
  //     // Create an object property node for each function we'll require.
  //
  //     // Create the `require` statement which will wrap those properties:
  //     //     `var { <properties> } = require(...)`
  //     const requireNode = variableDeclaration('var', [
  //       // variableDeclarator(objectPattern(importees), callExpression(identifier('require'), [literal(polyfillLocation)])),
  //       variableDeclarator(objectPattern(importees), callExpression(identifier('require'), [importSource])),
  //     ]);
  //
  //     return requireNode;
  //   }
  //   // esm
  //   else {
  //     const importNode = importDeclaration(importees, importSource);
  //   }
  //
  //   // const importNode = importDeclaration([importSpecifier(identifier('dogs'))], literal(polyfillLocation));
  //
  //   return importNode;

  //   const newNodes = polyfillNodes.map(polyfillNode => {
  //     const fnName = polyfillNode.name;
  //     // This creates code equivalent to the template literal
  //     //    `var { ${fnName} } = require('@sentry/utils/jsPolyfills')`
  //     const newNode = variableDeclaration('var', [
  //       variableDeclarator(
  //         objectPattern([
  //           property.from({ kind: 'init', key: identifier(fnName), value: identifier(fnName), shorthand: true }),
  //           property.from({ kind: 'init', key: identifier('dogs'), value: identifier('dogs'), shorthand: true }),
  //         ]),
  //         callExpression(identifier('require'), [literal(polyfillLocation)]),
  //       ),
  //     ]);
  //
  //     return newNode;
  //   });
  //
  //   return newNodes;
}

// TODO explain why we need both replacement plugins
// TODO break up PRs

// TODO make utils-specific pre-pack script to move jsPolyfills folder into the right spots, get rid of README
// TODO sourcemaps
// TODO make import statements be from utils package
// TODO try importing from `@sentry/utils/jsPolyfills`
// TODO write readme for polyfills
