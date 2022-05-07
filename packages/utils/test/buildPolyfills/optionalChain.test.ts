import { _optionalChain } from '../../src/buildPolyfills';
import { GenericFunction, GenericObject, Value } from '../../src/buildPolyfills/types';
import { _optionalChain as _optionalChainOrig } from './originals';

type OperationType = 'access' | 'call' | 'optionalAccess' | 'optionalCall';
type OperationExecutor =
  | ((intermediateValue: GenericObject) => Value)
  | ((intermediateValue: GenericFunction) => Value);
type Operation = [OperationType, OperationExecutor];

const truthy = { maisey: 'silly', charlie: 'goofy' };
const nullish = null;
const truthyFunc = (): GenericObject => truthy;
const nullishFunc = undefined;
const truthyReturn = (): GenericObject => truthy;
const nullishReturn = (): null => nullish;

describe('_optionalChain', () => {
  describe('returns the same result as the original', () => {
    // In these test cases, the array passed to `_optionalChain` has been broken up into the first entry followed by an
    // array of pairs of subsequent elements (so `[A, B, C, D, E]` becomes `A, [[B, C], [D, E]]`, as the second and third
    // entries in each test case), because this seemed the easiest way to express the type, which is really
    //     [Value, OperationType, Value => Value, OperationType, Value => Value, OperationType, Value => Value, ...].
    // We then undo this wrapping before passing the data to our functions.
    const testCases: Array<[string, Value, Operation[], Value]> = [
      ['truthy?.charlie', truthy, [['optionalAccess', (_: GenericObject) => _.charlie]], 'goofy'],
      ['nullish?.maisey', nullish, [['optionalAccess', (_: GenericObject) => _.maisey]], undefined],
      [
        'truthyFunc?.().maisey',
        truthyFunc,
        [
          ['optionalCall', (_: GenericFunction) => _()],
          ['access', (_: GenericObject) => _.maisey],
        ],
        'silly',
      ],
      [
        'nullishFunc?.().charlie',
        nullishFunc,
        [
          ['optionalCall', (_: GenericFunction) => _()],
          ['access', (_: GenericObject) => _.charlie],
        ],
        undefined,
      ],
      [
        'truthyReturn()?.maisey',
        truthyReturn,
        [
          ['call', (_: GenericFunction) => _()],
          ['optionalAccess', (_: GenericObject) => _.maisey],
        ],
        'silly',
      ],
      [
        'nullishReturn()?.charlie',
        nullishReturn,
        [
          ['call', (_: GenericFunction) => _()],
          ['optionalAccess', (_: GenericObject) => _.charlie],
        ],
        undefined,
      ],
    ];

    it.each(testCases)('%s', (_, initialChainComponent, operations, expectedValue) => {
      // `operations` is flattened and spread in order to undo the wrapping done in the test cases for TS purposes. See
      // note above test cases.
      expect(_optionalChain([initialChainComponent, ...operations.flat()])).toEqual(
        _optionalChainOrig([initialChainComponent, ...operations.flat()]),
      );
      expect(_optionalChain([initialChainComponent, ...operations.flat()])).toEqual(expectedValue);
    });
  });
});
