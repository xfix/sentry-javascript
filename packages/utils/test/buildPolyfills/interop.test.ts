import {
  _interopDefault,
  _interopNamespace,
  _interopNamespaceDefaultOnly,
  _interopRequireDefault,
  _interopRequireWildcard,
} from '../../src/buildPolyfills';
import { RequireResult } from '../../src/buildPolyfills/types';
import {
  _interopDefault as _interopDefaultOrig,
  _interopNamespace as _interopNamespaceOrig,
  _interopNamespaceDefaultOnly as _interopNamespaceDefaultOnlyOrig,
  _interopRequireDefault as _interopRequireDefaultOrig,
  _interopRequireWildcard as _interopRequireWildcardOrig,
} from './originals';

// Note: In real life, there are some test-case/function pairings here which would never happen, but by testing all
// combinations, we're guaranteed to have tested the ones which show up in the wild.

const dogStr = 'dogs are great!';
const dogFunc = () => dogStr;
const dogAdjectives = { maisey: 'silly', charlie: 'goofy' };

const withESModuleFlag = { __esModule: true, ...dogAdjectives };
const withESModuleFlagAndDefault = { __esModule: true, default: dogFunc, ...dogAdjectives };
const namedExports = { ...dogAdjectives };
const withNonEnumerableProp = { ...dogAdjectives };
// Properties added using `Object.defineProperty` are non-enumerable by default
Object.defineProperty(withNonEnumerableProp, 'hiddenProp', { value: 'shhhhhhhh' });
const withDefaultExport = { default: dogFunc, ...dogAdjectives };
const withOnlyDefaultExport = { default: dogFunc };
const exportsEquals = dogFunc as RequireResult;
const exportsEqualsWithDefault = dogFunc as RequireResult;
exportsEqualsWithDefault.default = exportsEqualsWithDefault;

const requireResults: Record<string, RequireResult> = {
  withESModuleFlag,
  withESModuleFlagAndDefault,
  namedExports,
  withNonEnumerableProp,
  withDefaultExport,
  withOnlyDefaultExport,
  exportsEquals: exportsEquals,
  exportsEqualsWithDefault: exportsEqualsWithDefault as unknown as RequireResult,
};

const testLabels: Record<string, string> = {
  withESModuleFlag: 'module with `__esModule` flag',
  withESModuleFlagAndDefault: 'module with `__esModule` flag and default export',
  namedExports: 'module with named exports',
  withNonEnumerableProp: 'module with named exports and non-enumerable prop',
  withDefaultExport: 'module with default export',
  withOnlyDefaultExport: 'module with only default export',
  exportsEquals: 'module using `exports =`',
  exportsEqualsWithDefault: 'module using `exports =` with default export',
};

function makeTestCases(expectedValues: Record<string, RequireResult>): Array<[string, RequireResult, RequireResult]> {
  return Object.keys(testLabels).map(key => [testLabels[key], requireResults[key], expectedValues[key]]);
}

describe('_interopNamespace', () => {
  describe('returns the same result as the original', () => {
    const expectedValues: Record<string, RequireResult> = {
      withESModuleFlag: withESModuleFlag,
      withESModuleFlagAndDefault: withESModuleFlagAndDefault,
      namedExports: { ...namedExports, default: namedExports },
      withNonEnumerableProp: {
        ...withNonEnumerableProp,
        default: withNonEnumerableProp,
      },
      withDefaultExport: { ...withDefaultExport, default: withDefaultExport },
      withOnlyDefaultExport: { default: withOnlyDefaultExport },
      exportsEquals: { default: exportsEquals },
      exportsEqualsWithDefault: { default: exportsEqualsWithDefault },
    };

    const testCases = makeTestCases(expectedValues);

    it.each(testCases)('%s', (_, requireResult, expectedValue) => {
      expect(_interopNamespace(requireResult)).toEqual(_interopNamespaceOrig(requireResult));
      expect(_interopNamespace(requireResult)).toEqual(expectedValue);
    });
  });
});

describe('_interopNamespaceDefaultOnly', () => {
  describe('returns the same result as the original', () => {
    const expectedValues: Record<string, RequireResult> = {
      withESModuleFlag: { default: withESModuleFlag },
      withESModuleFlagAndDefault: { default: withESModuleFlagAndDefault },
      namedExports: { default: namedExports },
      withNonEnumerableProp: { default: withNonEnumerableProp },
      withDefaultExport: { default: withDefaultExport },
      withOnlyDefaultExport: { default: withOnlyDefaultExport },
      exportsEquals: { default: exportsEquals },
      exportsEqualsWithDefault: { default: exportsEqualsWithDefault },
    };

    const testCases = makeTestCases(expectedValues);

    it.each(testCases)('%s', (_, requireResult, expectedValue) => {
      expect(_interopNamespaceDefaultOnly(requireResult)).toEqual(_interopNamespaceDefaultOnlyOrig(requireResult));
      expect(_interopNamespaceDefaultOnly(requireResult)).toEqual(expectedValue);
    });
  });
});

describe('_interopRequireWildcard', () => {
  describe('returns the same result as the original', () => {
    const expectedValues: Record<string, RequireResult> = {
      withESModuleFlag: withESModuleFlag,
      withESModuleFlagAndDefault: withESModuleFlagAndDefault,
      namedExports: { ...namedExports, default: namedExports },
      withNonEnumerableProp: {
        ...withNonEnumerableProp,
        default: withNonEnumerableProp,
      },
      withDefaultExport: { ...withDefaultExport, default: withDefaultExport },
      withOnlyDefaultExport: { default: withOnlyDefaultExport },
      exportsEquals: { default: exportsEquals },
      exportsEqualsWithDefault: { default: exportsEqualsWithDefault },
    };

    const testCases = makeTestCases(expectedValues);

    it.each(testCases)('%s', (_, requireResult, expectedValue) => {
      expect(_interopRequireWildcard(requireResult)).toEqual(_interopRequireWildcardOrig(requireResult));
      expect(_interopRequireWildcard(requireResult)).toEqual(expectedValue);
    });
  });
});

describe('_interopDefault', () => {
  describe('returns the same result as the original', () => {
    const expectedValues: Record<string, RequireResult> = {
      withESModuleFlag: undefined as unknown as RequireResult,
      withESModuleFlagAndDefault: withESModuleFlagAndDefault.default as RequireResult,
      namedExports: namedExports,
      withNonEnumerableProp: withNonEnumerableProp,
      withDefaultExport: withDefaultExport,
      withOnlyDefaultExport: withOnlyDefaultExport,
      exportsEquals: exportsEquals,
      exportsEqualsWithDefault: exportsEqualsWithDefault,
    };

    const testCases = makeTestCases(expectedValues);

    it.each(testCases)('%s', (_, requireResult, expectedValue) => {
      expect(_interopDefault(requireResult)).toEqual(_interopDefaultOrig(requireResult));
      expect(_interopDefault(requireResult)).toEqual(expectedValue);
    });
  });
});

describe('_interopRequireDefault', () => {
  describe('returns the same result as the original', () => {
    const expectedValues: Record<string, RequireResult> = {
      withESModuleFlag: withESModuleFlag,
      withESModuleFlagAndDefault: withESModuleFlagAndDefault,
      namedExports: { default: namedExports },
      withNonEnumerableProp: { default: withNonEnumerableProp },
      withDefaultExport: { default: withDefaultExport },
      withOnlyDefaultExport: { default: withOnlyDefaultExport },
      exportsEquals: { default: exportsEquals },
      exportsEqualsWithDefault: { default: exportsEqualsWithDefault },
    };

    const testCases = makeTestCases(expectedValues);

    it.each(testCases)('%s', (_, requireResult, expectedValue) => {
      expect(_interopRequireDefault(requireResult)).toEqual(_interopRequireDefaultOrig(requireResult));
      expect(_interopRequireDefault(requireResult)).toEqual(expectedValue);
    });
  });
});
